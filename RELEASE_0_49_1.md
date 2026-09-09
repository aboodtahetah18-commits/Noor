# Release 0.49.1 — P49.1 CI / Runtime Parity

Starts P49 by closing the Netlify test-runtime mismatch that caused 29 import-time suite failures and by preventing the same class of regression from returning.

### Fixed
- Runtime resolution of `@/...` imports in Vitest.
- Mobile navigation contract for `/transactions`, `/expenses`, `/advisor`, and `/settings`.
- Mobile transaction amount label contract.

### Added
- Early P49 CI/runtime parity verifier in the production quality gate.
- Full static audit that every aliased test import resolves to an existing source module.

### Compatibility
- P48.5 and P48.8 regression verifiers now accept later releases instead of failing on older exact version ranges.

### Database
- No migration added. Total remains 64.
