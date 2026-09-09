# Netlify Deployment — P48 Operational Policy

## Build configuration

Repository-controlled settings:

- Node.js: `24.20.0`
- npm: `11.19.0`
- Command: `npm run deploy:preflight && npm run quality:gate && npm run deploy:migrate`
- Publish directory: `.next`

Netlify's current Next.js adapter is used automatically.

## Context behavior

### Production

```text
APP_ENV=production
ALLOW_DB_MIGRATIONS=true
```

The deployment preflight validates the environment, then the idempotent migration runner applies only migrations not already recorded in `public.schema_migrations`.

### Deploy Preview / Branch Deploy

```text
APP_ENV=staging
ALLOW_DB_MIGRATIONS=false
```

The migration command exits successfully without modifying the database. This prevents a branch preview from changing production schema by accident.

## Required Netlify environment variables

Configure securely in Netlify:

1. `DATABASE_URL` (or compatibility alias `DATABASEURL`)
   - Neon PostgreSQL URL.
   - Include `sslmode=require`.
Recommended:

- `CRON_SECRET`
- `JOB_SECRET`

Optional AI explanation layer:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

`APP_BASE_URL` / `BETTER_AUTH_URL` are optional on Netlify because deploy URLs are resolved automatically. The current authentication implementation stores opaque random session tokens server-side and does not consume `BETTER_AUTH_SECRET`.

## Operational checks after deployment

1. Open `/api/health` → expected HTTP 200 with `status: ok`.
2. Open `/api/ready` → expected HTTP 200 with `status: ready` and `database: reachable`.
3. Open `/` → authenticated user goes to `/dashboard`; unauthenticated user goes to `/login`.
4. `/preview` must not expose synthetic financial data in staging/production.
5. Verify sign-in, onboarding, dashboard, bank operations, budget, and one read-only report.

## Failure interpretation

- `/api/health` 200 + `/api/ready` 503: process is alive but environment/database is not operationally ready.
- Build preflight failure: missing/invalid environment configuration; do not bypass it.
- Migration failure: deployment must fail rather than continue with a partially updated schema.
