# Production stability runbook

## Purpose
P54 adds a read-only post-launch stability check. It never writes financial data and never runs migrations.

## Run

```bash
npm run ops:stability -- https://YOUR-SITE.netlify.app
```

Default policy: 3 samples, 5 seconds apart. Every sample must pass health, readiness, and all critical route probes.

Optional controls:

```bash
npm run ops:stability -- https://YOUR-SITE.netlify.app --samples=5 --interval-ms=10000
npm run ops:stability -- https://YOUR-SITE.netlify.app --json
```

## Status meanings
- `STABLE`: every sample passed.
- `DEGRADED`: at least one sample passed and at least one failed.
- `UNSTABLE`: every sample failed.

Any result other than `STABLE` exits non-zero and should block production closure until investigated.

## Escalation
1. Check `/api/health`.
2. Check `/api/ready`; database must report `reachable`.
3. Run `npm run ops:status -- <url>` for a single detailed snapshot.
4. Review Netlify function/build logs and Neon availability.
5. If the newly deployed release introduced the issue, follow the rollback section in `PRODUCTION_RUNBOOK.md`.

Migration inventory remains 65 migrations.
