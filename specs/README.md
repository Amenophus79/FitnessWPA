# Fitness PWA Specs

This directory contains project-level specifications for the Fitness PWA.

## Files

```text
PROJECT_ROADMAP.md              Delivery phases and backlog
ARCHITECTURE.md                 System architecture and integration boundaries
DATABASE_SCHEMA.md              Supabase tables, relations, roles, and RLS
STATE_MACHINE.md                Training and exercise player state machines
EXERCISE_CATALOG_SCHEMA.md      Exercise catalog contract and examples
OPENAI_JSON_OUTPUT_SCHEMA.md    Expected OpenAI JSON output contract
NOTIFICATION_ENGINE.md          Browser notification rule engine
UI_COMPONENTS.md                UI component contracts and QA checklist
USER_STORIES.md                 Role-based product stories and acceptance criteria
RLS_SECURITY.md                 Supabase RLS policy specification
DOCKER.md                       Docker development and testing workflow
INSTALL.md                      Local, Docker, Supabase, and OpenAI setup
VERCEL_DEPLOYMENT.md            Hosted deployment target and integration setup
SAMPLE_PLANS/                   Importable sample plans
MARATHON_2026_SAMPLE_PLAN.json  Legacy root sample copy
README.md                       This overview
```

## Installation

From the project root:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Environment setup:

```bash
cp .env.example .env.local
```

The app can run without Supabase or OpenAI configuration. Set values only when using those optional integrations:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
```

Docker Compose and plain Node.js are both supported first execution paths. Vercel is the intended hosted deployment target.

## Architecture

The app is split by responsibility:

```text
app/                 Next.js runtime and routes
components/          UI components
features/            Domain logic
storage/             IndexedDB and sync queue
supabase/            Supabase integration
openai/              Plan generation
notifications/       Browser notifications
exercise-catalog/    Exercise metadata
types/               Domain contracts
tests/               Vitest coverage
```

Core runtime principles:

- Keep domain behavior pure and unit-testable.
- Write local data first, sync later.
- Validate imported and generated JSON before persistence.
- Keep OpenAI API keys server-side only.
- Use Supabase Auth invitations instead of public signup.

## Development Workflow

Recommended loop:

```bash
docker compose up --build
npm run dev
npm run test
npm run typecheck
npm run lint
npm run build
```

Use `public/examples/marathon-2026-09-12.json` or `specs/SAMPLE_PLANS/MARATHON_2026_SAMPLE_PLAN.json` for import testing.

Useful feature tests:

```text
tests/json-parser.test.ts
tests/exercise-player.test.ts
tests/notifications.test.ts
tests/body-measurements.test.ts
tests/statistics.test.ts
tests/openai-service.test.ts
tests/training-state-machine.test.ts
```

## VS Code Setup

Recommended extensions:

- ESLint
- Tailwind CSS IntelliSense
- Prettier
- TypeScript and JavaScript Language Features
- Docker

Recommended workspace settings:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

Recommended debugging targets:

- Run `npm run dev` in an integrated terminal.
- Open `http://localhost:3000`.
- Use React DevTools for component state.
- Use browser Application tools to inspect service worker, manifest, IndexedDB, and notification permission.

## Docker Workflow

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

See `specs/DOCKER.md` for details.
