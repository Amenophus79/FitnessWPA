# User Stories

## Roles

```text
admin
adult
child
```

## Admin Stories

### Invite user

As an admin, I want to invite a user by email so that public signup can remain disabled.

Acceptance criteria:

- Admin can enter an email address.
- Admin can choose role: `admin`, `adult`, or `child`.
- User receives Supabase invitation email.
- Invitation completion requires password setup.
- User can set a local PIN after invitation completion.

### Manage synced data

As an admin, I want to inspect synced plans, body measurements, and completions so that I can support users and troubleshoot sync issues.

Acceptance criteria:

- Admin can read records across users according to RLS.
- Admin can delete records only when necessary.
- Admin actions are auditable in future versions.

### Maintain exercise catalog

As an admin, I want to maintain exercise definitions so that generated and imported plans use consistent exercises.

Acceptance criteria:

- Exercise has ID, name, sport, muscles, description, image URL, video URL, preview duration, work duration, and rest duration.
- Duplicate IDs are rejected.
- Exercise references in plans must resolve to definitions.

## Adult User Stories

### Complete invitation registration

As an adult user, I want to complete an email invitation so that I can use the app without public signup.

Acceptance criteria:

- Invitation link opens registration completion.
- User sets password.
- User sets a self-selected PIN.
- PIN can unlock local offline access on the same device.

### Login with email and password

As an adult user, I want to log in with email and password so that my synced training data is available.

Acceptance criteria:

- Invalid credentials show a clear error.
- Successful login loads local and synced data.
- Session refresh is handled by Supabase.

### Unlock offline with PIN

As an adult user, I want to unlock the app with my PIN when offline so that I can train without internet.

Acceptance criteria:

- PIN works without network.
- PIN is stored only as a salted hash.
- Failed PIN attempts do not reveal whether the account exists.

### Import training plan JSON

As an adult user, I want to import a JSON training plan so that I can follow a structured program.

Acceptance criteria:

- JSON can be uploaded or pasted.
- Invalid JSON is rejected with useful errors.
- Plan supports start/end date or start/duration.
- Plan supports multiple activities per day.
- Plan supports multiple sports.

### Train with exercise player

As an adult user, I want to run a guided exercise session so that I know when to preview, work, rest, and move to the next exercise.

Acceptance criteria:

- Player starts in preview.
- Countdown is visible.
- Work and rest phases are distinct.
- Exercise image is visible.
- Video link is available.
- User can mark exercise completed.

### Track body measurements optionally

As an adult user, I want to optionally record weekly measurements so that I can observe trends during training without making body tracking mandatory.

Acceptance criteria:

- Supported fields include weight, BMI, body fat, waist, hip, chest, arm, thigh, resting heart rate, and VO2max.
- Charts update from local data.
- Measurements can be created offline.
- Missing values for the current week show a visible "open this week" hint.
- Missing weekly values never block training, import, export, or exercise completion.

### Export progress

As an adult user, I want to export plans and progress as JSON so that I can back up or inspect my data.

Acceptance criteria:

- Export includes plans.
- Export includes progress.
- Export includes body measurements.
- Export includes completed exercises.
- Export format is JSON.

## Child User Stories

### View assigned plan

As a child user, I want to view my assigned plan so that I can follow approved activities.

Acceptance criteria:

- Child sees only their own assigned data.
- Child can view activities and exercises.
- Child cannot invite users.
- Child cannot manage other users.

### Complete exercises

As a child user, I want to mark exercises complete so that my training progress is recorded.

Acceptance criteria:

- Completion works offline.
- Completion syncs later.
- Completion cannot modify another user's data.

## OpenAI Stories

### Generate plan from prompt

As a user, I want to describe my goal in natural language so that OpenAI can produce a valid training plan JSON.

Acceptance criteria:

- Prompt is sent through server-side API route.
- API key never leaves the server.
- Output is JSON only.
- Output validates before import.
- Unsupported sports are rejected.

### Use prompt template

As a user, I want to choose a plan template so that the generated plan follows a known training pattern.

Acceptance criteria:

- Templates include marathon, Hyrox, ultra running, strength, rowing, climbing, bouldering, and multi-sport.
- Template prompt can be combined with custom text.
- Generated output uses the same JSON schema as imports.

## Notification Stories

### Enable reminders

As a user, I want to enable browser reminders so that I do not miss training sessions.

Acceptance criteria:

- Browser permission is requested only after user action.
- Permission status is visible.
- Rules can be toggled.

### Receive sport-specific reminder

As a runner, I want a running reminder before running activities so that I can prepare shoes, route, and hydration.

Acceptance criteria:

- Rule matches only running activities.
- Lead time is applied.
- Message includes activity name when configured.

## Offline Stories

### Use app without internet

As a user, I want the app to work without internet so that I can train anywhere.

Acceptance criteria:

- Existing plan is available offline.
- Exercise player works offline after app load.
- Measurements can be recorded offline.
- Completions can be recorded offline.
- Sync happens when internet returns.
