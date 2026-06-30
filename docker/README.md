# Docker

The root `Dockerfile` and `docker-compose.yml` run the local Next.js dev server on port `3000`.

```bash
docker compose up --build
```

The project directory is mounted into the container for hot reload. Dependencies live in the container volume at `/app/node_modules`.
