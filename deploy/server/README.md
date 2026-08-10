# Fitness PWA Server Deployment

This deployment runs Fitness PWA on a regular Docker host behind Caddy. Caddy obtains and renews a publicly trusted TLS certificate, and HTTP Basic Auth protects both the application and `/api/local-store`.

## Prerequisites

- A server with Docker Engine and Docker Compose
- A domain or subdomain whose A/AAAA record points to the server
- Incoming TCP ports 80 and 443 and UDP port 443

Home Assistant OS does not run arbitrary Compose projects. Deploy this stack on a regular Docker host, VPS, NAS, or a separate virtual machine. Packaging it as a Home Assistant app requires an additional app manifest and is a separate deployment target.

## Configuration

From the repository root:

```bash
cp deploy/server/server.env.example deploy/server/server.env
```

Create a password hash. The plaintext password is not stored in the repository:

```bash
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'choose-a-long-password'
```

Enter the resulting hash in `deploy/server/server.env` using single quotes so its `$` characters remain literal. Set `PWA_DOMAIN`, `ACME_EMAIL`, and `PWA_USERNAME` as well.

Do not add `server.env` to Git. Optional OpenAI and Supabase values can be added to the same file.

## Start

```bash
docker compose \
  --env-file deploy/server/server.env \
  -f deploy/server/compose.yml \
  up -d --build
```

Inspect the deployment:

```bash
docker compose \
  --env-file deploy/server/server.env \
  -f deploy/server/compose.yml \
  ps
```

```bash
docker compose \
  --env-file deploy/server/server.env \
  -f deploy/server/compose.yml \
  logs --tail=100 caddy fitness-pwa
```

Open `https://your-domain.example` and authenticate with the configured username and plaintext password.

## iPhone Installation

1. Open the HTTPS URL in Safari and authenticate.
2. Wait for the page to finish loading and reload it once.
3. Choose **Share**, **Add to Home Screen**, and enable **Open as Web App**.
4. Open the installed app once while online.
5. Close it fully, enable airplane mode, and reopen it to verify the cold offline launch.
6. Reconnect and use **Sync** to verify that offline changes reach the server snapshot.

The origin must remain unchanged. Keep the same domain and HTTPS scheme across deployments.

## Persistence And Backup

The SQLite database lives in the named volume `fitness-pwa-server_fitness_data`. Caddy certificates live in `fitness-pwa-server_caddy_data` and `fitness-pwa-server_caddy_config`. Do not remove these volumes during upgrades. Stop the app briefly for a filesystem-level backup so the SQLite database and WAL form a consistent snapshot.

Create a snapshot backup:

```bash
docker compose \
  --env-file deploy/server/server.env \
  -f deploy/server/compose.yml \
  stop fitness-pwa

docker run --rm \
  -v fitness-pwa-server_fitness_data:/source:ro \
  -v "$PWD":/backup \
  alpine:3.22 \
  tar -czf /backup/fitness-pwa-data-backup.tar.gz -C /source .

docker compose \
  --env-file deploy/server/server.env \
  -f deploy/server/compose.yml \
  start fitness-pwa
```

## Optional MariaDB

Set `MARIADB_HOST`, `MARIADB_USER`, and `MARIADB_PASSWORD` in `server.env` to use an existing MariaDB server. `MARIADB_DATABASE` defaults to `homeassistant`. The app creates only the prefixed `fitness_pwa_state` table. SQLite remains in the data volume as a current fallback and is migrated automatically when MariaDB first becomes available.

## Update

After updating the repository:

```bash
docker compose \
  --env-file deploy/server/server.env \
  -f deploy/server/compose.yml \
  up -d --build
```

The build generates a new atomic Service Worker cache. Existing installed clients retain their previous complete cache until the updated app shell has downloaded successfully.
