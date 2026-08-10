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
- Transactional SQLite persistence for Docker/Node runs without Supabase.
- Optional MariaDB replication with automatic Home Assistant service discovery.

## Quick Start

Docker Compose builds and runs the production application, including the generated offline app shell:

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

For local development with hot reload:

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

The development server binds to `0.0.0.0` on port `3000`, so other devices on the same local network can inspect the current UI with this URL:

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

This plain HTTP development URL is not an installable offline deployment on iOS. Service workers require a secure HTTPS origin; the `localhost` exception applies only to the machine that runs the browser. Use a regular HTTPS deployment or the trusted local HTTPS setup described in `INSTALL.md` before adding the app to an iPhone or iPad Home Screen.

Local Docker/Node runs persist user data to `data/fitness-pwa.sqlite` by default. Set `LOCAL_DATA_DIR` for direct Node.js runs or `LOCAL_DATA_HOST_DIR` for Docker when SQLite should live outside the repository/container. An existing `local-store.json` in the same directory is imported once and then retained as a legacy backup.

SQLite remains the durable local mirror when MariaDB is enabled. A Home Assistant app discovers `/services/mysql` automatically; regular Docker deployments can provide the `MARIADB_*` variables from `.env.example`. At startup the highest database revision is copied to the stale or empty store. Writes commit to SQLite first, so a MariaDB outage does not make the app unavailable.

Target deployment is Vercel. Docker provides a production-equivalent local build; the optional iOS Compose override serves that build with a user-supplied trusted certificate.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run start:https
npm run typecheck
npm run test
npm run lint
```

## Deployment

Target hosted deployment is Vercel, with optional Supabase and OpenAI integrations. See:

```text
VERCEL_DEPLOYMENT.md
```

For a self-hosted Docker server with automatic HTTPS, persistent data, and access protection, see:

```text
deploy/server/README.md
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
