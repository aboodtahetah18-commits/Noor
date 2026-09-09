# P48.3 + P48.4 — Dependency Governance & Production Quality Gate

## P48.3 — Dependency governance

Implemented:
- Node runtime pinned to 24.20.x.
- npm pinned to 11.x / packageManager npm@11.19.0.
- all direct dependencies and devDependencies remain exact-version pinned.
- `.npmrc` enforces engine compatibility and exact saves.
- GitHub CI no longer uses pnpm; it now matches the npm runtime declared by the project.
- dependency-policy verifier validates package-manager/runtime/exact-version policy.

Open:
- `package-lock.json` generation remains pending because registry access timed out in the current environment and its Node/npm versions do not match production.
- this release deliberately does not fabricate a lockfile.

## P48.4 — Production quality gate

`npm run quality:gate` now runs, in order:
1. dependency policy verification;
2. route integrity verification;
3. P48 runtime-readiness regression;
4. P47 visual closure regression;
5. ESLint with zero-warning policy;
6. strict TypeScript typecheck;
7. Vitest suite;
8. Next.js production build.

Netlify production build order is now:

```text
Deployment Preflight
→ Full Production Quality Gate
→ Database Migrations
→ Publish built .next output
```

This ensures migrations are not applied when the application build itself fails.

## Database

No schema change. Migration count remains 64.
