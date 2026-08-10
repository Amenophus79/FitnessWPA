# Install

## First Execution Options

Docker Compose builds and starts the production application with its generated offline app shell:

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

`LOCAL_DATA_DIR` controls local SQLite persistence for direct Node.js runs. Set it to an absolute path when the data should live outside the repository:

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

## Local SQLite Persistence

When the app runs through local Node.js or Docker, it also persists user data to:

```text
data/fitness-pwa.sqlite
```

By default, the database is created automatically at `data/fitness-pwa.sqlite`. With `LOCAL_DATA_DIR` for Node.js or `LOCAL_DATA_HOST_DIR` for Docker, it can live in any writable directory outside the project and outside the container. It stores plans, body measurements, exercise catalog entries, and completed exercises. An older `local-store.json` in that directory is imported once without being deleted.

## Docker

Docker is a supported local development and testing path, not a required external service.

```bash
docker compose up --build
```

The container runs a production build and exposes port `3000`. This is suitable for desktop testing through `http://localhost:3000`, but plain HTTP over a LAN is not a secure PWA origin on iOS.

## iPhone And iPad Offline Installation

The safest installation path is a regular deployment with a publicly trusted HTTPS certificate, such as Vercel. Open that HTTPS URL in Safari, wait for the page to finish loading, and then use **Add to Home Screen**.

For a local-only deployment, the certificate must contain the Mac's current LAN IP or hostname and must be trusted by iOS. One development option is `mkcert`:

```bash
brew install mkcert
mkcert -install
mkdir -p .local-certs
FITNESS_PWA_IP=$(ipconfig getifaddr en0)
mkcert \
  -cert-file .local-certs/fitness-pwa.pem \
  -key-file .local-certs/fitness-pwa-key.pem \
  "$FITNESS_PWA_IP" localhost 127.0.0.1 ::1
```

Install the `rootCA.pem` reported by `mkcert -CAROOT` on the iPhone or iPad and explicitly enable trust for that certificate authority in iOS. Only install a private development CA that you control.

Run the local HTTPS production build directly:

```bash
npm run build
LOCAL_TLS_CERT_PATH=.local-certs/fitness-pwa.pem \
LOCAL_TLS_KEY_PATH=.local-certs/fitness-pwa-key.pem \
npm run start:https
```

Or use the Docker HTTPS override:

```bash
LOCAL_TLS_CERT_FILE="$PWD/.local-certs/fitness-pwa.pem" \
LOCAL_TLS_KEY_FILE="$PWD/.local-certs/fitness-pwa-key.pem" \
docker compose -f docker-compose.yml -f docker-compose.ios.yml up --build
```

Open `https://<local-machine-ip>:3443` in Safari. Do not install from `http://<local-machine-ip>:3000`; that creates a Home Screen link without a usable Service Worker.

The production build embeds all initial Next.js CSS and JavaScript files in a build-specific cache. Installation is atomic: an incomplete update is not activated, the previous complete cache remains available, API responses are never cached, and both cold and previously used launches can start without a network connection.

To verify a cold launch, install while online, close the Home Screen app completely, disable Wi-Fi and cellular data, and reopen it. For a warm launch, use the app once, close it, keep the device offline, and open it again.

## Vercel

Vercel is the intended hosted deployment target. Configure Supabase and OpenAI environment variables in Vercel only when those integrations should be enabled.

Full deployment guide:

```text
VERCEL_DEPLOYMENT.md
```
