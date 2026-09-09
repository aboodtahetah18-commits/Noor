# Release 0.48.4 — Production Quality Gate

### Added
- Production quality-gate orchestrator.
- Dependency policy verifier.
- Exact-save and engine-strict npm policy.
- P48.3/P48.4 structural verifier.
- Dependency lock status document.

### Changed
- GitHub CI migrated from pnpm to npm 11 to match `packageManager` and Netlify.
- Netlify now performs the full application quality/build gate before applying production migrations.
- Legacy P47/P48 regression verifiers now accept newer release versions instead of failing solely on an old exact version string.

### Known blocker
- A committed `package-lock.json` is still pending generation under Node 24/npm 11 with registry access. This release does not claim complete transitive dependency reproducibility.

### Database
- No migration added. Total remains 64.
