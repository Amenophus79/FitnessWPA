# Row-Level Security Specification

## Purpose

Supabase is optional. When it is configured, Row-Level Security protects synced data by user and role. IndexedDB protects offline usability, but Supabase must enforce ownership for all cloud reads and writes.

Related files:

```text
supabase/client.ts
storage/sync-engine.ts
features/auth/auth-service.ts
specs/DATABASE_SCHEMA.md
```

## Roles

```text
admin
adult
child
```

Recommended role source:

```text
auth.jwt() -> 'user_metadata' ->> 'role'
```

Fallback role:

```text
adult
```

## Security Assumptions

- Public signup is disabled.
- Users are created through Supabase invitations.
- Authenticated users have a stable `auth.uid()`.
- All synced records include `user_id`.
- Client-provided role values must not be trusted unless they come from signed Supabase JWT metadata.
- OpenAI API keys are server-side only.

## Tables Covered

```text
plans
body_measurements
completed_exercises
```

## RLS Enablement

```sql
alter table public.plans enable row level security;
alter table public.body_measurements enable row level security;
alter table public.completed_exercises enable row level security;
```

## Role Helper

```sql
create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'adult')
$$;
```

## Admin Helper

```sql
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_user_role() = 'admin'
$$;
```

## Owner Policies

Users may read their own records. Admins may read all records.

```sql
create policy "Read own plans or admin"
on public.plans
for select
using (user_id = auth.uid() or public.is_admin());

create policy "Read own body measurements or admin"
on public.body_measurements
for select
using (user_id = auth.uid() or public.is_admin());

create policy "Read own completed exercises or admin"
on public.completed_exercises
for select
using (user_id = auth.uid() or public.is_admin());
```

## Insert Policies

Users may insert only records owned by their own `auth.uid()`. Admins may insert records for support workflows.

```sql
create policy "Insert own plans or admin"
on public.plans
for insert
with check (user_id = auth.uid() or public.is_admin());

create policy "Insert own body measurements or admin"
on public.body_measurements
for insert
with check (user_id = auth.uid() or public.is_admin());

create policy "Insert own completed exercises or admin"
on public.completed_exercises
for insert
with check (user_id = auth.uid() or public.is_admin());
```

## Update Policies

Users may update only their own records. Admins may update all records.

```sql
create policy "Update own plans or admin"
on public.plans
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "Update own body measurements or admin"
on public.body_measurements
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "Update own completed exercises or admin"
on public.completed_exercises
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
```

## Delete Policies

Default user deletion should be disabled. Admin deletion is allowed for support and cleanup.

```sql
create policy "Admin delete plans"
on public.plans
for delete
using (public.is_admin());

create policy "Admin delete body measurements"
on public.body_measurements
for delete
using (public.is_admin());

create policy "Admin delete completed exercises"
on public.completed_exercises
for delete
using (public.is_admin());
```

## Child Role Constraints

The current JSON-backed table design enforces ownership but does not yet distinguish parent-child data delegation. Future child role constraints should add:

- `managed_by_user_id` where an adult manages a child account.
- Policies allowing adult managers to read child records.
- Policies preventing child users from inviting others or changing role metadata.

Recommended future relation:

```sql
create table public.user_relationships (
  adult_user_id uuid not null references auth.users(id) on delete cascade,
  child_user_id uuid not null references auth.users(id) on delete cascade,
  relationship text not null default 'guardian',
  primary key (adult_user_id, child_user_id)
);
```

## Storage Security

If Supabase Storage is later used for exercise media:

- Use private buckets for user-uploaded media.
- Use public buckets only for curated catalog assets.
- Enforce object paths by user ID for private files.
- Never store OpenAI keys or service role keys in Storage.

## API Route Security

OpenAI route:

```text
app/api/openai/route.ts
```

Requirements:

- Read `OPENAI_API_KEY` from server environment only.
- Treat OpenAI as optional; missing configuration must not block app startup.
- Reject empty prompts.
- Validate generated JSON before import.
- Avoid logging full prompts if they may contain sensitive health context.

## QA Checklist

- Anonymous users cannot select from any application table.
- Authenticated users can read only their own rows.
- Authenticated users cannot insert rows for another `user_id`.
- Authenticated users cannot update rows to another `user_id`.
- Child users cannot access admin-only UI.
- Admin policies are explicitly tested before production.
- Service role key is never exposed to the browser.
