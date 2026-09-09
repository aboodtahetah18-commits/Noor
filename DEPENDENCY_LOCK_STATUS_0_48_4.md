# Dependency Lock Status — v0.48.4

## Current status

Direct production and development dependencies are pinned to exact versions in `package.json`.
The project declares:

- Node `24.20.x`
- npm `11.x`
- package manager `npm@11.19.0`
- `.npmrc` with `engine-strict=true` and `save-exact=true`

## Remaining blocker

`package-lock.json` is not yet committed.

A lockfile generation attempt in the current execution environment could not be completed because:

- the environment provides Node 22 / npm 10 instead of the project runtime;
- npm registry access timed out.

A lockfile must not be hand-written or fabricated.

## Closure command

Run in an environment with Node 24.20.x, npm 11.19.0, and registry access:

```bash
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
npm ci --include=dev --no-audit --no-fund
npm run quality:gate
```

Commit the generated `package-lock.json` only after the quality gate succeeds.

## Deployment behavior until closure

- CI uses `npm ci` when a lockfile exists.
- CI temporarily falls back to `npm install` when it does not and emits a warning.
- The dependency policy verifier also emits a reproducibility warning when the lockfile is absent.
- No false claim of a reproducible transitive dependency graph is made in this release.
