# Mustaqbali — GitHub + Vercel handoff

Prepared for migration from manual ZIP/Netlify deployment to GitHub + Vercel.

## Repository contract
- GitHub is the canonical source repository.
- `main` is production.
- feature/fix branches produce Vercel Preview deployments.
- `.env*`, `.vercel/`, `.next/`, `node_modules/`, logs, and coverage are excluded from Git.

## Vercel contract
- Framework: Next.js
- Build command: `npm run vercel:build`
- Install command: `npm install`
- Output: `.next`
- Vercel-native environment detection through `VERCEL_ENV` is supported by deployment preflight.
- Preview deployments cannot run database migrations.
- Production migrations remain an explicit operator action, never an automatic parallel build step.

## Required account-level environment variables
Secrets are intentionally not committed to GitHub. Configure in Vercel Project Settings:
- DATABASE_URL
- APP_BASE_URL / BETTER_AUTH_URL (production origin)
- CRON_SECRET (if cron endpoints are enabled)
- JOB_SECRET (if job endpoints are enabled)
- OPENAI_API_KEY (optional)
- OPENAI_MODEL (optional)

## Release flow
1. Push to GitHub.
2. Vercel builds preview/production automatically.
3. Quality gate runs before Next.js build completes.
4. Run database migration intentionally when a release contains unapplied migrations.
