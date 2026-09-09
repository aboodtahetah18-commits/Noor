# Release 0.48.2

Starts P48 production-readiness work.

### Added
- Context-aware deployment preflight.
- Context-aware, explicit database migration runner.
- `/api/ready` Neon readiness endpoint.
- Static internal route-integrity verifier.

### Changed
- Netlify production and deploy-preview contexts are now separated.
- Deploy Preview cannot automatically apply database migrations.
- `/preview` is development-only in operational environments.
- Deployment documentation now distinguishes liveness from readiness.

### Compatibility
- `staging:preflight` and `staging:migrate` remain as aliases.
- Phase 41 verifier was updated to recognize the safer P48 deployment policy instead of requiring permanent staging migration enablement.

### Financial integrity
No financial rule, transaction semantic, recommendation rule, recovery rule, goal rule, or budget calculation changed.

### Database
No migration added; total remains 64.
