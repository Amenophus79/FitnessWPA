# Docker Specification

Docker Compose is a valid first execution option for this project. It must run the offline-first app without Supabase or OpenAI configuration.

The app can also run with plain Node.js:

```bash
npm install
npm run dev
```

The Docker setup provides a containerized Next.js development environment with hot reload on port `3000`. Target hosted deployment is Vercel; Docker is the local containerized execution path.

## Files

```text
Dockerfile
docker-compose.yml
docker/README.md
```

## Dockerfile

Base image:

```text
node:22-alpine
```

Build steps:

1. Set `/app` as the working directory.
2. Copy `package*.json`.
3. Run `npm install`.
4. Copy the project files.
5. Expose port `3000`.
6. Run `npm run dev`.

## Docker Compose

Service:

```text
app
```

Command:

```bash
npm run dev
```

Port mapping:

```text
3000:3000
```

Volumes:

```text
.:/app
/app/node_modules
```

The source directory mount enables hot reload. The anonymous `node_modules` volume prevents the host mount from replacing container-installed dependencies.

## Environment Variables

All integration variables are optional for local startup.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
```

Values can be provided through `.env`, shell environment, or the compose invocation environment. Empty values are valid for offline-first demo mode.

## Start

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

## Local Testing

Run tests on the host:

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

Run tests inside the container:

```bash
docker compose run --rm app npm run test
docker compose run --rm app npm run typecheck
docker compose run --rm app npm run lint
docker compose run --rm app npm run build
```

## Reset Container State

```bash
docker compose down
docker compose down --volumes
docker compose up --build
```

Use `--volumes` when dependency state inside the container should be rebuilt from scratch.
