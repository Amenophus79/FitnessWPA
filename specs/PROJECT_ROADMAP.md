# Project Roadmap

## Vision

Fitness PWA is an offline-first, invitation-only training planner for multi-sport athletes and families. It should support structured plans, body tracking, statistics, browser notifications, exercise playback, and OpenAI-assisted plan generation while remaining usable without internet access.

## Product Principles

- Offline usage is a primary workflow, not a fallback.
- Imported or AI-generated JSON must be validated before use.
- Domain logic should stay pure and unit-testable.
- Supabase can store synced user data when configured, but IndexedDB is the first-write store.
- The UI should feel like a practical training tool, not a marketing page.
- Roles must be simple and enforceable: `admin`, `adult`, `child`.

## Current Foundation

Implemented foundation:

- Next.js 15 application shell.
- TypeScript domain model.
- Tailwind CSS and local shadcn-style UI primitives.
- Zustand auth store.
- TanStack Query provider.
- PWA manifest and service worker.
- IndexedDB stores and sync queue.
- Supabase client typing.
- Invitation-oriented auth service.
- Exercise catalog.
- Exercise player state machine.
- Training navigation state machine.
- JSON import parser and export helper.
- Statistics and body measurement helpers.
- Notification scheduler.
- OpenAI plan generation service.
- Docker development setup.
- Vitest unit tests for core modules.

## Milestone 1: MVP Hardening

Goal: Make the current skeleton production-shaped enough for daily local use.

Scope:

- Persist imported plans through IndexedDB from the UI.
- Load plans, measurements, completions, and statistics from IndexedDB on app start.
- Show sync status per entity.
- Add user-friendly JSON import validation messages.
- Add empty states for no plan, no measurements, and no network.
- Add basic profile screen with role and PIN status.

Acceptance criteria:

- A user can import a plan, close the browser, reopen the app, and still see the plan.
- A user can record a body measurement offline.
- The sync queue remains visible and explainable in the UI.
- Invalid JSON never reaches storage.

## Milestone 2: Supabase Auth and Sync

Goal: Make invitation login and cloud sync operational.

Scope:

- Supabase project migration SQL.
- RLS policies for all synced tables.
- Invitation flow from admin.
- Email/password login form.
- PIN setup and offline PIN unlock.
- Sync conflict handling using `updatedAt`.
- Per-user filtering by `auth.uid()`.

Acceptance criteria:

- Public signup is disabled.
- Invited users can complete registration.
- Logged-in users can sync plans and measurements.
- Users cannot read or mutate another user's records.
- Admin role can inspect and manage records according to RLS policy.

## Milestone 3: Training Experience

Goal: Make training sessions usable end to end.

Scope:

- Full activity detail view.
- Exercise player persistence.
- Mark activity complete.
- Mark individual exercise complete.
- Tabata timing presets.
- Rest and preview controls.
- Video link behavior.
- Local completion history.

Acceptance criteria:

- Preview, work, rest, next exercise, and complete phases are deterministic.
- Completion records are available offline and later synced.
- Tabata sessions run with repeatable 20/10 timing by default.
- The player can recover from page refresh without losing the current activity.

## Milestone 4: Body Tracking and Statistics

Goal: Turn measurements and completions into useful feedback.

Scope:

- Weekly body measurement form with all supported fields.
- Optional weekly body measurement hint when the current week is open.
- Charts for weight, BMI, body fat, VO2max, and resting heart rate.
- Weekly volume by sport.
- Running and rowing distance totals.
- Completion rate by plan and activity.
- Training streak.

Acceptance criteria:

- Statistics are recalculated from local data.
- Charts handle missing values.
- Trends are readable on mobile and desktop.
- Export includes plans, measurements, completions, and statistics.

## Milestone 5: Notifications

Goal: Provide reliable browser reminders without creating alert fatigue.

Scope:

- Browser permission onboarding.
- Daily reminders.
- Weekday reminders.
- Sport-specific reminders.
- Rest-period prompts.
- Per-rule enable/disable.
- Snooze and quiet-hours support.

Acceptance criteria:

- Reminders can be generated from plan notification rules.
- The user can disable individual rules.
- No notification is sent without browser permission.
- Notification state is persisted locally.

## Milestone 6: OpenAI Plan Generation

Goal: Convert natural-language prompts into valid importable training plans.

Scope:

- Template picker.
- Prompt editor.
- Server-side OpenAI route.
- JSON schema hardening.
- Generated plan preview before import.
- Validation repair loop for malformed responses.

Acceptance criteria:

- OpenAI responses are JSON-only.
- Generated JSON validates through the same import parser as uploaded JSON.
- The API key never reaches the browser.
- Unsupported sports or weekdays are rejected.

## Milestone 7: Production Readiness

Goal: Prepare deployment and long-term maintenance.

Scope:

- CI pipeline for lint, typecheck, tests, and build.
- Supabase migration files.
- Vercel production deployment guide and environment checklist.
- Error boundary and structured logging.
- PWA install QA.
- Lighthouse pass.
- Dependency audit process.
- Documentation review.

Acceptance criteria:

- CI blocks broken builds.
- Database schema can be recreated from migration files.
- PWA can be installed and opened offline after first load.
- Security-sensitive flows have tests or documented manual QA.

## Backlog

- Shared family plans for adult and child roles.
- Coach/admin dashboard.
- Exercise catalog editor.
- Media upload and Supabase Storage integration.
- Calendar export.
- Garmin, Strava, or HealthKit imports.
- Program templates for marathon, ultra, Hyrox, climbing, rowing, and strength.
- Accessibility audit.
- Localization for German and English.
