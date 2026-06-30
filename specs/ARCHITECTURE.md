# Architecture Specification

## Clean Architecture

The Fitness PWA follows a clean architecture split where UI, domain logic, infrastructure, and external services remain independently testable.

```text
app/                 Next.js routing, layouts, API routes, PWA registration
components/          Reusable UI surfaces and shadcn-style primitives
features/            Domain use cases, state machines, parsers, calculators
services/            Cross-cutting helpers such as dates, IDs, query client
storage/             IndexedDB persistence and offline sync queue
supabase/            Supabase client and database type contract
openai/              OpenAI plan generation service and prompt templates
notifications/       Browser notification scheduling and notification port
exercise-catalog/    Reusable exercise definitions and media metadata
types/               Strong TypeScript domain model
tests/               Vitest coverage for pure logic
```

Dependencies should point inward:

```text
UI -> features -> types
UI -> storage/services
storage -> supabase
openai -> import schema contract
tests -> features/services
```

Feature modules should avoid direct DOM, browser notification, or Supabase calls unless the feature explicitly owns that integration. Pure behavior belongs in `features/` so it can be unit tested without rendering React.

## Components

The component layer is intentionally thin. It should format and connect state, but not own business rules.

Core component groups:

- `components/ui/`: local shadcn-style primitives such as Button, Card, Input, Tabs, Progress, Badge, and Switch.
- `components/dashboard/`: application surfaces for schedule, player, import, notifications, statistics, and body tracking.
- `app/`: Next.js composition boundary, metadata, API routes, and service worker registration.

Expected component behavior:

- Reusable controls receive typed props and expose simple event callbacks.
- Domain calculations are delegated to `features/statistics`, `features/body`, `features/import`, and `features/exercise-player`.
- Network calls are isolated behind services and API routes.

## State Machine

Two state machines model training flow.

Exercise player:

```text
Preview -> Work -> Rest -> Next Exercise -> Complete
```

Implementation:

```text
features/exercise-player/player-state-machine.ts
```

The player state is strongly typed:

- `phase`: `preview`, `work`, `rest`, or `complete`
- `exerciseIndex`: current exercise
- `round`: current round within an exercise
- `remainingSeconds`: countdown value
- `completedExerciseIds`: completed local exercise IDs

Training navigation:

```text
Plan -> Week -> Day -> Activity -> Exercise -> Preview -> Work -> Rest -> Complete
```

Implementation:

```text
features/training/training-state-machine.ts
```

Invalid transitions throw explicit errors so UI flows and tests can catch inconsistent state early.

## Offline-First Concept

The app must remain useful without network access.

Local stores:

```text
plans
bodyMeasurements
completedExercises
exerciseCatalog
statistics
syncQueue
```

Implementation:

```text
storage/indexed-db.ts
storage/offline-store.ts
storage/sync-engine.ts
```

Offline write flow:

1. User imports a plan, completes an exercise, or records a body measurement.
2. The data is written to IndexedDB immediately.
3. A sync queue item is created with entity type, entity ID, action, payload, and timestamp.
4. The UI can continue from IndexedDB while offline.
5. When the browser emits `online`, `SyncEngine.syncPending()` upserts queued items to Supabase.
6. Successful sync items are removed from the queue.

Conflict handling is represented in the domain as `syncStatus: pending | synced | conflict`. Future conflict resolution should compare `updatedAt` values and preserve local edits until the user or a deterministic merge strategy resolves them.

## Supabase Integration

Supabase is optional. When configured, it is used for:

- Auth with invitation-based registration.
- Email/password login.
- Session persistence and refresh.
- Server synchronization for plans, body measurements, and completed exercises.

Client:

```text
supabase/client.ts
```

Tables currently represented in TypeScript:

```text
plans
body_measurements
completed_exercises
```

Auth behavior:

- Public signup must be disabled in Supabase.
- Users are invited by email.
- Roles are stored as auth metadata: `admin`, `adult`, or `child`.
- PIN unlock is local-first and stored as a browser-side salted hash for offline access.
- Without Supabase configuration, the app remains usable in offline-first local demo mode.

## OpenAI Integration

OpenAI generates training plan JSON from natural language prompts and can extend the exercise catalog.

Files:

```text
openai/openai-service.ts
openai/prompt-templates.ts
openai/training-plan-json-schema.ts
openai/exercise-catalog-json-schema.ts
app/api/openai/route.ts
app/api/openai/exercise-catalog/route.ts
```

Input:

```text
natural language prompt
optional prompt template ID
```

Output:

```text
training plan JSON matching the expected plan import contract
```

OpenAI is optional. The app starts without `OPENAI_API_KEY`; generation requests return `OPENAI_NOT_CONFIGURED` until a key is provided. The API route keeps `OPENAI_API_KEY` server-side. The service requests JSON schema output and the import layer validates generated content before it becomes a `Plan`.

Plan generation receives the current exercise catalog from the frontend. Generated plan activities may reference existing catalog IDs instead of duplicating exercise definitions. New catalog items can be generated through the separate exercise catalog endpoint and are validated before being stored in IndexedDB.

Supported prompt templates:

- Marathon preparation
- Hyrox
- Ultra running
- Strength
- Rowing
- Climbing
- Bouldering
- Multi-sport plans

## Multi-Sport Support

Supported sport values:

```text
running
tabata
strength
mobility
rowing
cycling
swimming
bouldering
rock_climbing
yoga
walking
hiking
```

The domain allows multiple activities per day:

```text
Monday: Running + Mobility
Friday: Progressive Long Run + Tabata
```

Each activity owns:

- sport
- name
- intensity
- duration
- distance when relevant
- exercises
- completion timestamp

This keeps the plan model flexible enough for endurance training, climbing, strength blocks, recovery work, and mixed daily sessions.
