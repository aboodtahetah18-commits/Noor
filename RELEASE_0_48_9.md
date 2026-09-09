# Release 0.48.9 — Netlify Environment Example Resilience

### Fixed
- Prevented Vitest from failing with `ENOENT` when `.env.example` is absent from the deployment checkout.
- Added a tracked non-hidden environment example template and deterministic restore script.
- Updated the test command to restore/validate `.env.example` before Vitest.
- Updated the P48.8 regression verifier to accept later P48 patch releases.

### Database
- No migration added. Total remains 64.
