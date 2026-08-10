# Vercel Deployment With Supabase and OpenAI

This guide describes the intended hosted deployment path for Fitness PWA:

```text
Vercel       -> Next.js hosting and API route runtime
Supabase     -> optional auth and cloud sync
OpenAI       -> optional training plan generation
IndexedDB    -> required offline-first local storage
```

The app can run on Vercel without Supabase and OpenAI. Add those integrations only when you want invitation auth, sync, and AI-generated plans.

## 1. Preflight

Run these locally before deploying:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Docker can also be used for the first local run:

```bash
docker compose up --build
```

## 2. Deploy The Next.js App To Vercel

Recommended Vercel project settings:

```text
Framework Preset: Next.js
Install Command: npm install
Build Command: npm run build
Output Directory: default / managed by Next.js
Development Command: npm run dev
Node.js Version: 22.x
```

Typical flow:

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. Create a new Vercel project from that repository.
3. Keep the Next.js framework preset.
4. Add environment variables only for the integrations you want to enable.
5. Deploy a preview.
6. Promote to production after smoke testing.

## 3. Environment Variables

### Required For Base App

None.

The offline-first app starts without external configuration.

### Optional Supabase

Add these when enabling Supabase Auth and sync:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are intentionally public browser values.
- Do not expose a Supabase service role key to the browser.
- `NEXT_PUBLIC_SITE_URL` is recommended for stable production redirects.

### Optional OpenAI

Add these when enabling OpenAI plan generation:

```env
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-5.2
```

Notes:

- `OPENAI_API_KEY` must be server-side only.
- Do not prefix the OpenAI key with `NEXT_PUBLIC_`.
- If `OPENAI_API_KEY` is missing, `/api/openai` returns `OPENAI_NOT_CONFIGURED` for generation requests.

## 4. Supabase Setup

### Create Project

1. Create a Supabase project.
2. Copy the project URL and anon key.
3. Add both values to Vercel environment variables.
4. Disable public signup.
5. Use email invitations for registration.

### Create Tables

Use the schema from:

```text
specs/DATABASE_SCHEMA.md
```

Required tables:

```text
plans
body_measurements
completed_exercises
```

Apply the RLS policies from:

```text
specs/RLS_SECURITY.md
```

### Configure Auth Redirect URLs

In Supabase Auth URL settings:

```text
Site URL:
https://your-production-domain.example
```

Additional Redirect URLs:

```text
http://localhost:3000/**
https://*-<team-or-account-slug>.vercel.app/**
https://your-production-domain.example/**
```

Use the Vercel preview wildcard for preview deployments. Replace `<team-or-account-slug>` with the Vercel team or account slug.

### Invitation Flow

Production invitation flow should be:

```text
Admin UI -> server-only API route or Supabase Edge Function -> Supabase Admin invite -> user email
```

Important:

- The current Supabase browser client must not receive a service role key.
- `supabase.auth.admin.inviteUserByEmail` requires privileged credentials.
- Implement admin invitations behind a server route or Edge Function before production use.

## 5. OpenAI Setup

1. Create an OpenAI API key.
2. Add `OPENAI_API_KEY` to Vercel as a sensitive/server-side environment variable.
3. Optionally set `OPENAI_MODEL`.
4. Deploy or redeploy.
5. Smoke test:

```bash
curl -X POST https://your-domain.example/api/openai \
  -H "content-type: application/json" \
  -d '{"prompt":"Create a 4 week running and mobility plan","template":"marathon"}'
```

Expected behavior:

- With a valid key: route returns generated JSON.
- Without a key: route returns `OPENAI_NOT_CONFIGURED`.
- Invalid generated JSON must still be rejected by the import parser before persistence.

## 6. Vercel Environment Scope

Set variables for the intended scopes:

```text
Development  -> local Vercel development
Preview      -> pull request / branch preview deployments
Production   -> production domain
```

Recommended:

- Add Supabase and OpenAI variables to Preview only when preview deployments should use real services.
- Use a separate Supabase project for production if possible.
- Avoid using production OpenAI keys in untrusted preview branches.

## 7. Deployment Smoke Test

After deployment:

1. Open the Vercel deployment URL.
2. Confirm the dashboard loads without errors.
3. Confirm the PWA manifest is available:

```text
https://your-domain.example/manifest.webmanifest
```

4. Confirm OpenAI status:

```bash
curl https://your-domain.example/api/openai
```

Expected with key:

```json
{ "configured": true, "model": "gpt-5.2" }
```

Expected without key:

```json
{ "configured": false, "model": "gpt-5.2" }
```

5. If Supabase is configured, test login/invitation redirect URLs.
6. Import `specs/SAMPLE_PLANS/MARATHON_2026_SAMPLE_PLAN.json`.
7. Record a body measurement.
8. Wait until the Service Worker is active, close the app, enable offline mode, and confirm a cold launch renders the profile screen.
9. Use the app online once, close it, remain offline, and confirm a warm launch renders local IndexedDB data.
10. Confirm `/api/local-store` and other APIs fail as network requests while offline instead of returning cached HTML.
11. Deploy a second build and confirm the new worker activates only after its complete app shell has been downloaded.

## 8. Security Checklist

- `OPENAI_API_KEY` is not prefixed with `NEXT_PUBLIC_`.
- Supabase service role key is not present in Vercel client environment variables.
- Public signup is disabled in Supabase.
- RLS is enabled on all Supabase application tables.
- Preview deployments do not use production secrets unless intentionally allowed.
- OpenAI prompts and responses are not logged with sensitive health details.
- Auth redirect URLs include production, local, and preview domains.

## 9. Rollback

Vercel supports promoting previous deployments. If a production deployment fails:

1. Roll back to the last healthy production deployment in Vercel.
2. Check build logs.
3. Verify environment variables.
4. Verify Supabase RLS changes were not partially applied.
5. Redeploy after local `npm run build` passes.

## Official References

- Vercel Next.js docs: `https://vercel.com/docs/frameworks/full-stack/nextjs`
- Vercel environment variables: `https://vercel.com/docs/environment-variables`
- Supabase redirect URLs: `https://supabase.com/docs/guides/auth/redirect-urls`
- OpenAI API quickstart: `https://developers.openai.com/api/docs/quickstart`
