# Mustaqbali — Vercel Deployment Contract

Vercel is the primary application host. GitHub is the source of truth.

## Build
- Vercel framework: Next.js
- Install: `npm install`
- Build: `npm run vercel:build`
- The build runs deployment preflight, governance contracts, lint, typecheck, tests, and `next build`.
- Database migrations are intentionally **not** run automatically in preview/production builds.

## Required Vercel environment variables
Configure these in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL` — Neon PostgreSQL connection string including `sslmode=require`
- `APP_BASE_URL` — production origin (recommended for production)
- `BETTER_AUTH_URL` — production auth origin (recommended for production)
- `CRON_SECRET` — at least 32 characters if scheduler endpoints are enabled
- `JOB_SECRET` — at least 32 characters if background job endpoints are enabled
- `OPENAI_API_KEY` — optional
- `OPENAI_MODEL` — optional

`APP_ENV` is optional on Vercel. The deployment preflight derives production/staging from `VERCEL_ENV` when `APP_ENV` is absent.

## Migrations
Run migrations intentionally with production environment variables, never as part of parallel preview builds:

`ALLOW_DB_MIGRATIONS=true npm run vercel:migrate`

## Git flow
- `main` -> Vercel Production
- Pull requests / non-main branches -> Vercel Preview
