# Current Release Status — V1.5.0

## Product scope
The Personal Finance Advisor application scope is implementation-complete for the approved release baseline.

- Financial engine decisions are finalized.
- Owner-scoped authentication and account security are implemented.
- Core financial ledgers, goals, emergency, savings, obligations, income, expenses, transfers, refunds, planning, forecasting, advisor, reports and cycle closing are implemented.
- Mobile, tablet and desktop protected shells are covered by responsive/accessibility regression contracts.
- Production health, readiness, auth health, security headers, protected-route redirects and hostile-origin rejection are covered by the live production validation command.
- Database migration inventory: 66.

## Release evidence model
Build-time quality gates validate repository integrity. Post-deploy acceptance is intentionally separate because the deployed HTTPS origin does not exist until after the build succeeds.

Final live acceptance sequence:

```bash
npm run ops:live-validate -- https://YOUR-SITE.netlify.app --report=live-production-acceptance.json
npm run ops:release-seal -- --live-report=live-production-acceptance.json
```

`ops:release-seal` fails closed unless the live production validation report is accepted, has zero failed checks, and matches the current release version.

## Dependency lock note
Direct dependencies are exact-version pinned. `package-lock.json` is not fabricated in this artifact environment because the required Node 24.20/npm 11.19 runtime is unavailable locally. Netlify remains the authoritative dependency installation environment.
