# Netlify npm configuration self-healing fix — 2026-09-09

## Failure observed
Netlify quality gate stopped at dependency policy because `.npmrc` was not present in the deployed source, so required `engine-strict=true` and `save-exact=true` could not be verified.

## Root cause containment
The repository already carries the correct `.npmrc`, but hidden files can be omitted by some upload/extract/repack workflows. The build is now resilient to that omission.

## Changes
- Netlify build command runs `npm run ensure:npmrc` before deployment preflight.
- `prequality:gate` also runs `scripts/ensure-npmrc.mjs` automatically before `npm run quality:gate`.
- Production quality gate itself begins with an npm configuration contract step that regenerates/verifies `.npmrc`.
- Required settings remain enforced: `engine-strict=true`, `save-exact=true`, `audit=false`, `fund=false`.

## Verification
- NPMRC ensure: PASS
- Dependency policy: PASS (lockfile remains a warning, not a failure)
- Project execution contract: PASS
- Design system contract: PASS
- UI token compliance: PASS
- Mobile overflow contract: PASS
- Route integrity: PASS
