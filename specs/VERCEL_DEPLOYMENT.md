# Vercel Deployment Specification

The hosted deployment target for Fitness PWA is Vercel. Supabase and OpenAI are optional integrations layered onto the offline-first app.

Canonical operational guide:

```text
../VERCEL_DEPLOYMENT.md
```

## Deployment Shape

```text
Browser
  -> Vercel-hosted Next.js app
  -> IndexedDB for offline-first local data
  -> Supabase when auth/sync is configured
  -> OpenAI through server-side /api/openai route when configured
```

## Required For Base Deployment

No external services are required.

The base deployment must:

- build with `npm run build`
- serve the dashboard
- serve the PWA manifest
- allow JSON import
- allow local IndexedDB usage
- return `OPENAI_NOT_CONFIGURED` for generation requests when OpenAI is absent

## Optional Integrations

### Supabase

Environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

Used for:

- invitation auth
- email/password login
- cloud sync
- RLS-protected data storage

### OpenAI

Environment variables:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
```

Used for:

- natural-language training plan generation
- JSON-only plan output
- schema-guided generation

## Vercel Settings

```text
Framework Preset: Next.js
Install Command: npm install
Build Command: npm run build
Development Command: npm run dev
Node.js Version: 22.x
```

## Supabase Redirects

Production:

```text
https://your-production-domain.example
```

Additional URLs:

```text
http://localhost:3000/**
https://*-<team-or-account-slug>.vercel.app/**
https://your-production-domain.example/**
```

## Production Caveat

Supabase admin invitations require privileged credentials. Never expose a Supabase service role key through `NEXT_PUBLIC_*` variables or browser code.

Production invitation flow should use:

```text
server-only API route
or
Supabase Edge Function
```

## Verification

Before deployment:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

After deployment:

```bash
curl https://your-domain.example/api/openai
curl https://your-domain.example/manifest.webmanifest
```

Expected OpenAI status without key:

```json
{
  "configured": false,
  "model": "gpt-5.2"
}
```
