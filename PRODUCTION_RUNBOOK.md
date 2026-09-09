# Production Runbook — v0.53.0

## Purpose
This runbook is the operator handoff for the Personal Finance Advisor production release. It does not change financial data.

## Release acceptance
A production deployment is accepted only when all of the following are true:

1. Netlify build and `quality:gate` pass with zero lint warnings.
2. Production migrations complete under the existing deployment policy; the repository inventory remains **66 migrations**.
3. Run the non-destructive post-deploy smoke test:
   `npm run smoke:production -- https://YOUR-SITE.netlify.app`
4. Run the operational summary:
   `npm run ops:status -- https://YOUR-SITE.netlify.app`
5. `/api/health` reports `status=ok`.
6. `/api/ready` reports `status=ready` and `database=reachable`.
7. Critical routes do not return 5xx responses.

For machine-readable output:
`npm run ops:status -- https://YOUR-SITE.netlify.app --json`

## Hold conditions
Do not declare the release operational if:

- `/api/ready` is not HTTP 200.
- Neon is not reachable.
- Any critical route returns HTTP 5xx.
- The production smoke command exits non-zero.
- Netlify quality gate fails.

## Rollback
If a newly deployed release fails the acceptance conditions, restore the last known-good Netlify production deploy before performing further schema or data changes. Re-run both `smoke:production` and `ops:status` after rollback.

## Safety
The smoke and status commands issue GET requests only. They do not create, update, reverse, delete, or migrate financial records.

## Final release seal
After the deployed origin passes live production validation, persist the report and seal the exact release:

```bash
npm run ops:live-validate -- https://YOUR-SITE.netlify.app --report=live-production-acceptance.json
npm run ops:release-seal -- --live-report=live-production-acceptance.json
```

The seal fails closed if the report is rejected, contains failed checks, is for a different package version, or is not from an HTTPS origin.
