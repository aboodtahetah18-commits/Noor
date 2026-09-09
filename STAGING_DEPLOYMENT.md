# P48 — Staging / Deploy Preview Deployment

## Target architecture

Netlify Deploy Preview / branch deploy → server-side credential/session authentication → dedicated Neon staging/preview branch.

A preview deployment must not mutate the production schema automatically.

## Required environment variables

For staging/preview contexts:

- `DATABASE_URL` or `DATABASEURL` — Neon PostgreSQL connection string including `sslmode=require`.
- `APP_ENV=staging`.

Recommended for scheduled endpoints:

- `CRON_SECRET` — minimum 32 characters.
- `JOB_SECRET` — minimum 32 characters.

`APP_BASE_URL` and `BETTER_AUTH_URL` may be omitted on Netlify; the runtime resolves `DEPLOY_PRIME_URL`, `DEPLOY_URL`, and `URL` and adds them to the server-side trusted-origin set.

## Migration safety policy

- Netlify **production** context: `APP_ENV=production`, `ALLOW_DB_MIGRATIONS=true`.
- Netlify **deploy-preview** context: `APP_ENV=staging`, `ALLOW_DB_MIGRATIONS=false`.
- Netlify **branch-deploy** context: `APP_ENV=staging`, `ALLOW_DB_MIGRATIONS=false`.

This means preview builds may connect to an already-prepared staging branch, but they never apply schema changes automatically.

For a dedicated staging branch that needs new migrations, run them intentionally from an operator/CI context:

```text
APP_ENV=staging
ALLOW_DB_MIGRATIONS=true
DATABASE_URL=<staging-neon-url>
npm run deploy:preflight
npm run deploy:migrate
```

Backward-compatible aliases remain available:

```text
npm run staging:preflight
npm run staging:migrate
```

## Runtime checks

- `/api/health` — process liveness only; does not prove database readiness.
- `/api/ready` — validates server environment and executes a minimal Neon query. Returns HTTP 503 if the application is not operationally ready.

## Preview route

`/preview` contains synthetic design data and is now development-only. In staging/production it redirects to the real application entrypoint.

## Safety gates

- Do not enable automatic DB migrations in Deploy Preview.
- Do not use the production Neon database for visual/branch previews.
- Never expose database or server secrets in client-side environment variables.
