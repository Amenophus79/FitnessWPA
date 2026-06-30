# Installation Specification

## Requirements

Recommended local tooling:

```text
Node.js 22
npm 10+
Docker Desktop or compatible Docker engine
VS Code
```

The Docker image uses:

```text
node:22-alpine
```

## First Execution Options

Docker Compose is a valid first execution option:

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Local Node.js is also supported:

From the project root:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Configuration

The app can run without environment configuration. Create a local environment file only when enabling optional integrations:

```bash
cp .env.example .env.local
```

Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
```

Notes:

- `NEXT_PUBLIC_*` values are exposed to the browser.
- `OPENAI_API_KEY` must stay server-side.
- Supabase is optional for local demo mode.
- OpenAI is optional for local demo mode.
- If Supabase is configured, public signup should be disabled and email invitations should be used for registration.
- If OpenAI is not configured, the app still starts and `/api/openai` reports `OPENAI_NOT_CONFIGURED` for generation requests.

## Development Commands

```bash
npm run dev
npm run test
npm run typecheck
npm run lint
npm run build
```

## Docker Installation

Use this path for containerized local development and reproducible first runs.

Start the development container:

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Run one-off commands:

```bash
docker compose run --rm app npm run test
docker compose run --rm app npm run typecheck
docker compose run --rm app npm run lint
docker compose run --rm app npm run build
```

Reset container dependencies:

```bash
docker compose down --volumes
docker compose up --build
```

## Supabase Setup

1. Create a Supabase project.
2. Disable public signup.
3. Configure email templates for invitations.
4. Create tables from `specs/DATABASE_SCHEMA.md`.
5. Apply RLS policies from `specs/RLS_SECURITY.md`.
6. Put project URL and anon key into `.env.local`.

Required tables:

```text
plans
body_measurements
completed_exercises
```

## OpenAI Setup

1. Create an OpenAI API key.
2. Add it to `.env.local` as `OPENAI_API_KEY`.
3. Optional: set `OPENAI_MODEL`.
4. Start the app and call the OpenAI route through the UI or API.

API route:

```text
app/api/openai/route.ts
```

## Vercel Deployment

Vercel is the intended hosted deployment target.

Detailed deployment guide:

```text
VERCEL_DEPLOYMENT.md
```

Recommended Vercel settings:

- Framework preset: Next.js
- Build command: `npm run build`
- Install command: `npm install`
- Output directory: managed by Next.js

Environment variables in Vercel are optional unless enabling integrations:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
```

## Sample Plans

Importable sample plans live in:

```text
specs/SAMPLE_PLANS/
public/examples/
```

The marathon sample targets:

```text
2026-09-12
```

## VS Code Setup

Recommended extensions:

- ESLint
- Tailwind CSS IntelliSense
- Prettier
- Docker

Recommended settings:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Verification Checklist

Before handing off changes:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected result:

- No lint errors.
- No TypeScript errors.
- Unit tests pass.
- Production build completes.
