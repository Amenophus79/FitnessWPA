# Architecture

## Boundaries

```text
app/                 Next.js routes, layout, API routes, service worker registration
components/          Reusable UI and dashboard surfaces
features/            Domain use cases and pure state machines
services/            Shared infrastructure helpers
storage/             IndexedDB stores and sync queue
supabase/            Supabase client and database typing
openai/              OpenAI service, schemas, and prompt templates
notifications/       Browser notification scheduling
exercise-catalog/    Reusable exercise definitions
types/               Strong TypeScript domain contracts
tests/               Vitest unit tests
docker/              Docker notes
```

## Data Flow

1. Training plans are imported through `features/import/training-plan-schema.ts`.
2. Valid JSON becomes a strongly typed `Plan`.
3. `storage/offline-store.ts` persists plans, completions, measurements, and statistics in IndexedDB.
4. `storage/sync-engine.ts` consumes queued writes and upserts them to Supabase when the browser is online.
5. Statistics are calculated from plans and measurements in `features/statistics/statistics-service.ts`.

## Auth

`features/auth/auth-service.ts` supports:

- Supabase invitation completion.
- Email/password login.
- Local PIN hash storage and PIN unlock.
- Admin invitation calls for service-role environments.

Disable public signup in Supabase and invite users by email.

## State Machines

Exercise player:

```text
Preview -> Work -> Rest -> Next Exercise -> Complete
```

Training navigation:

```text
Plan -> Week -> Day -> Activity -> Exercise -> Preview -> Work -> Rest -> Complete
```

Both are strongly typed and unit tested.
