# Release 0.48.10 — P48.5 Lockfile Runtime Alignment

### Added
- Runtime-guarded `dependencies:lock` command for deterministic npm lockfile generation.
- Validation that generated lockfiles use lockfile v3 and match the application version.

### Changed
- Aligned README package-manager instructions with the approved npm 11.19 policy.
- Removed stale pnpm setup and quality-gate commands from the operational README.

### Known limitation
- `package-lock.json` is intentionally not fabricated in the current Node 22 / registry-constrained execution environment. Generate it under Node 24.20.x + npm 11.19.x with `npm run dependencies:lock`.

### Database
- No migration added. Total remains 64.
