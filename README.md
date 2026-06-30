# Fitness PWA

Offline-first multi-sport training planner built with Next.js 15, TypeScript, Tailwind CSS, shadcn-style UI primitives, Zustand, TanStack Query, IndexedDB, Vitest, Docker, and optional Supabase/OpenAI integrations.

## Features

- Optional invitation-based Supabase authentication with email/password and local PIN unlock.
- Offline-first IndexedDB storage for plans, completions, body measurements, and statistics.
- Automatic sync queue for Supabase when that integration is configured and the browser returns online.
- JSON import/export for training plans and progress data.
- Multi-sport plan model supporting running, Tabata, strength, mobility, rowing, cycling, swimming, bouldering, rock climbing, yoga, walking, and hiking.
- Exercise catalog and countdown player with Preview, Work, Rest, Next Exercise, and Complete states.
- Body tracking charts and statistics for streak, weekly volume, distance, completion, and body trends.
- Browser notification scheduling.
- Optional OpenAI service for JSON-only plan generation.
- Local JSON file persistence for Docker/Node runs without Supabase.

## Quick Start

Docker Compose is a supported first execution option:

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Local Node.js is equally supported:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

No environment variables are required for the local offline-first demo. Copy `.env.example` to `.env.local` only when Supabase sync/auth or OpenAI plan generation is needed.

## Local Network Access

The development server binds to `0.0.0.0` on port `3000`, so other devices on the same local network can open the app with this URL:

```text
http://<local-machine-ip>:3000
```

On macOS, find the Wi-Fi IP address with:

```bash
ipconfig getifaddr en0
```

If that command returns nothing, list network hardware ports and use the device name for the active adapter:

```bash
networksetup -listallhardwareports
ipconfig getifaddr <device>
```

For example:

```text
http://192.168.1.42:3000
```

If the app does not load from another device, check that both devices are on the same network and that the macOS firewall allows incoming connections for the dev server.

Local Docker/Node runs persist user data to `data/local-store.json` by default. Set `LOCAL_DATA_DIR` for direct Node.js runs or `LOCAL_DATA_HOST_DIR` for Docker when the JSON storage should live outside the repository/container. Plans and exercise catalog changes survive restarts without Supabase.

Target deployment is Vercel. Docker remains a valid local execution path for development and testing.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run test
npm run lint
```

## Deployment

Target hosted deployment is Vercel, with optional Supabase and OpenAI integrations. See:

```text
VERCEL_DEPLOYMENT.md
```

## Seed Plan And Catalog

The app starts with the Marathon 2026 + Tabata Strength Support plan derived from:

```text
features/seed/marathon-tabata-start-plan.ts
```

The compact seed is normalized through the regular import pipeline in:

```text
features/seed/default-plan.ts
```

The built-in exercise database is seeded from:

```text
exercise-catalog/catalog.ts
```

On first app load, the built-in catalog is written to IndexedDB and the local JSON store. The seed is installation-time only; later user edits and deletions are preserved.
