# Release 0.48.5 — Netlify ESLint Configuration Repair

### Fixed
- Replaced incompatible `FlatCompat` based Next.js ESLint loading with ESLint 9 native flat configuration.
- Prevented legacy adapter `any` usage from blocking the entire deployment while preserving strict `no-explicit-any` enforcement in Domain, Financial Engine, and Application layers.
- Updated the P48 verifier to accept compatible hotfix versions newer than 0.48.4.

### Database
- No migration added. Total remains 64.

### Expected Netlify behavior
The previous `ConfigArrayFactory` / `QUALITY-GATE-FAIL lint exit=2` configuration crash should no longer occur. Netlify will proceed to actual source linting and then TypeScript/tests/build.
