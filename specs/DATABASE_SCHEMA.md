# Database Schema

The application uses Supabase Auth plus three JSON-backed application tables. IndexedDB remains the first write target; Supabase is the sync target.

Implementation:

```text
supabase/client.ts
storage/sync-engine.ts
features/auth/auth-service.ts
```

## Roles

Application roles:

```text
admin
adult
child
```

Recommended storage:

```text
auth.users.raw_user_meta_data.role
```

Role behavior:

- `admin`: can invite users, inspect all synced data, and manage catalog/policy data.
- `adult`: can manage their own plans, measurements, and completions.
- `child`: can read and update their own assigned training data.

Public signup should be disabled. Registration should happen through Supabase email invitations.

## Tables

### `plans`

Stores full training plan payloads.

```sql
create table public.plans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
```

Expected `data` payload:

```text
Plan
```

Includes weeks, days, activities, exercises, notification rules, sync status, and timestamps.

### `body_measurements`

Stores weekly body measurement payloads.

```sql
create table public.body_measurements (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  measured_at date not null,
  updated_at timestamptz not null default now()
);
```

Expected `data` payload:

```text
BodyMeasurement
```

Supported fields:

```text
weightKg
bmi
bodyFatPercent
waistCm
hipCm
chestCm
armCm
thighCm
restingHeartRate
vo2Max
```

### `completed_exercises`

Stores completion events.

```sql
create table public.completed_exercises (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  completed_at timestamptz not null
);
```

Expected `data` payload:

```json
{
  "exerciseId": "exercise_burpee_w1_tue",
  "activityId": "activity_tabata_w1_tue",
  "completedAt": "2026-08-04T18:28:00.000Z"
}
```

## Relations

Current physical relations:

```text
auth.users.id -> plans.user_id
auth.users.id -> body_measurements.user_id
auth.users.id -> completed_exercises.user_id
```

Logical relations inside JSON payloads:

```text
Plan -> Week -> Day -> Activity -> Exercise
Activity -> CompletedExercise
User -> BodyMeasurement
Plan -> NotificationRule
```

Future normalized tables may split plan structure into `plans`, `weeks`, `days`, `activities`, `exercises`, and `notification_rules`, but the current sync design favors fewer upserts and complete offline payloads.

## Indexes

```sql
create index plans_user_id_updated_at_idx
  on public.plans (user_id, updated_at desc);

create index body_measurements_user_id_measured_at_idx
  on public.body_measurements (user_id, measured_at desc);

create index completed_exercises_user_id_completed_at_idx
  on public.completed_exercises (user_id, completed_at desc);
```

## Row-Level Security

Enable RLS:

```sql
alter table public.plans enable row level security;
alter table public.body_measurements enable row level security;
alter table public.completed_exercises enable row level security;
```

Helper role check:

```sql
create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'adult')
$$;
```

### Owner Read Policies

```sql
create policy "Users can read own plans"
on public.plans
for select
using (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "Users can read own body measurements"
on public.body_measurements
for select
using (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "Users can read own completed exercises"
on public.completed_exercises
for select
using (user_id = auth.uid() or public.current_user_role() = 'admin');
```

### Owner Insert Policies

```sql
create policy "Users can insert own plans"
on public.plans
for insert
with check (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "Users can insert own body measurements"
on public.body_measurements
for insert
with check (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "Users can insert own completed exercises"
on public.completed_exercises
for insert
with check (user_id = auth.uid() or public.current_user_role() = 'admin');
```

### Owner Update Policies

```sql
create policy "Users can update own plans"
on public.plans
for update
using (user_id = auth.uid() or public.current_user_role() = 'admin')
with check (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "Users can update own body measurements"
on public.body_measurements
for update
using (user_id = auth.uid() or public.current_user_role() = 'admin')
with check (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "Users can update own completed exercises"
on public.completed_exercises
for update
using (user_id = auth.uid() or public.current_user_role() = 'admin')
with check (user_id = auth.uid() or public.current_user_role() = 'admin');
```

### Delete Policies

Deletes should be rare and explicit.

```sql
create policy "Admins can delete plans"
on public.plans
for delete
using (public.current_user_role() = 'admin');

create policy "Admins can delete body measurements"
on public.body_measurements
for delete
using (public.current_user_role() = 'admin');

create policy "Admins can delete completed exercises"
on public.completed_exercises
for delete
using (public.current_user_role() = 'admin');
```

## Invitation Flow

1. Admin invites a user by email through Supabase Auth.
2. User follows invitation link.
3. User sets password.
4. User selects PIN for local offline unlock.
5. User metadata receives role: `admin`, `adult`, or `child`.
6. App sync uses `auth.uid()` as `user_id`.
