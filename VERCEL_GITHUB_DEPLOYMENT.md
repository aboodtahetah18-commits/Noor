# Mustaqbali — GitHub + Vercel deployment

## Architecture
GitHub is the canonical source repository. Vercel deploys the `main` branch to production and pull requests to Preview deployments.

## Required Vercel environment variables
Production:
- `APP_ENV=production`
- `DATABASE_URL=<production Neon PostgreSQL URL>`
- `APP_BASE_URL=https://<production-domain>`
- `BETTER_AUTH_URL=https://<production-domain>`
- `CRON_SECRET=<32+ character secret>`
- `JOB_SECRET=<32+ character secret>`
- `OPENAI_API_KEY` only if the optional AI explanation layer is enabled.

Preview:
- `APP_ENV=staging`
- `DATABASE_URL=<preview/staging database URL>`
- `ALLOW_DB_MIGRATIONS=false`

## Migration policy
Vercel builds never run database migrations. Production migrations use the protected GitHub Actions workflow `Production Database Migration`, which is manual by design to preserve accounting safety and avoid concurrent migration attempts.

## Build
Vercel runs `npm run vercel:build`, which performs Vercel preflight and the full project quality gate. The quality gate itself runs the production Next.js build.
