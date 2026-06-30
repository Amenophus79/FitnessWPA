# Docker

Docker Compose is a valid first execution option for this project and should work without Supabase or OpenAI configuration.

The app can also run directly with local Node.js:

```bash
npm install
npm run dev
```

## Start

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

## Development Behavior

The compose service:

- Builds from the root `Dockerfile`.
- Runs `npm run dev`.
- Mounts the repository into `/app`.
- Keeps `node_modules` in a container volume.
- Persists local JSON app data through `${LOCAL_DATA_HOST_DIR:-./data}:${LOCAL_DATA_CONTAINER_DIR:-/app/data}`.
- Exposes port `3000`.

Supabase and OpenAI environment variables are optional. Empty values keep the local offline-first app usable; only the matching integration features are unavailable.

## Local JSON Persistence

The Docker service writes app data to:

```text
/app/data/local-store.json
```

By default, Compose mounts `./data` to `/app/data`, so the same file is available on the host as:

```text
data/local-store.json
```

To keep the storage outside the repository and outside the container, set `LOCAL_DATA_HOST_DIR` before starting Docker:

```bash
LOCAL_DATA_HOST_DIR=/Users/you/FitnessPWA-storage docker compose up --build
```

Or create a Docker Compose `.env` file:

```env
LOCAL_DATA_HOST_DIR=/Users/you/FitnessPWA-storage
LOCAL_DATA_CONTAINER_DIR=/app/data
```

The app inside the container receives `LOCAL_DATA_DIR=/app/data`, so no app code needs to know the host path.

The file stores:

- plans
- body measurements
- exercise catalog entries
- completed exercises

This is enough to run locally without Vercel or Supabase. IndexedDB remains available in the browser for offline use, while the JSON file provides host-level persistence across Docker restarts.

## OpenAI In Docker

OpenAI is optional. To enable local plan/catalog generation in Docker, set:

```env
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-5.2
```

Then start:

```bash
docker compose up --build
```

The key stays server-side in the Next.js API route. The browser only calls `/api/openai`.

Target hosted deployment is Vercel. Docker is kept as the local containerized execution path for development, testing, and reproducible first runs.

Vercel deployment guide:

```text
VERCEL_DEPLOYMENT.md
```

## Useful Commands

```bash
docker compose down
docker compose up
docker compose logs -f app
```
