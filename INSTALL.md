# Install

## First Execution Options

Docker Compose is a valid first execution option:

```bash
docker compose up --build
```

The app runs on:

```text
http://localhost:3000
```

Local Node.js is also supported:

```bash
npm install
npm run dev
```

The app runs on:

```text
http://localhost:3000
```

## Environment

The app can run without configuration. Create `.env.local` only when optional integrations are needed:

```bash
cp .env.example .env.local
```

Set values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
LOCAL_DATA_DIR=./data
LOCAL_DATA_HOST_DIR=./data
LOCAL_DATA_CONTAINER_DIR=/app/data
```

Supabase is optional for the local offline-first demo. When Supabase is configured, public signup should stay disabled and email invitations should be used for registration.

OpenAI is optional. If `OPENAI_API_KEY` is empty, the app still starts and the OpenAI API route returns `OPENAI_NOT_CONFIGURED` when called.

`LOCAL_DATA_DIR` controls local JSON file persistence for direct Node.js runs. Set it to an absolute path when the data should live outside the repository:

```env
LOCAL_DATA_DIR=/Users/you/FitnessPWA-storage
```

Docker Compose uses a bind mount instead:

```env
LOCAL_DATA_HOST_DIR=/Users/you/FitnessPWA-storage
LOCAL_DATA_CONTAINER_DIR=/app/data
```

`LOCAL_DATA_HOST_DIR` is the directory on your machine. `LOCAL_DATA_CONTAINER_DIR` is the internal path mounted into the container and is passed to the app as `LOCAL_DATA_DIR`.

## Initial Seed

On first local execution, the app installs starter data into IndexedDB:

- Marathon 2026 + Tabata Strength Support plan
- built-in exercise catalog
- optional body-tracking setup

This seed runs only once per local browser profile and local JSON store. Metadata flags record that the installation seed has been applied. After that, plans and exercises are user-owned data: they can be changed, extended, replaced, or deleted without being restored automatically on the next app start.

## Local JSON Persistence

When the app runs through local Node.js or Docker, it also persists user data to:

```text
data/local-store.json
```

By default, the file is created automatically at `data/local-store.json`. With `LOCAL_DATA_DIR` for Node.js or `LOCAL_DATA_HOST_DIR` for Docker, the same file can live in any writable directory outside the project and outside the container. It stores plans, body measurements, exercise catalog entries, and completed exercises. This makes the local Docker run usable without Vercel or Supabase.

## Docker

Docker is a supported local development and testing path, not a required external service.

```bash
docker compose up --build
```

The container runs `npm run dev` with hot reload and exposes port `3000`.

## Vercel

Vercel is the intended hosted deployment target. Configure Supabase and OpenAI environment variables in Vercel only when those integrations should be enabled.

Full deployment guide:

```text
VERCEL_DEPLOYMENT.md
```
