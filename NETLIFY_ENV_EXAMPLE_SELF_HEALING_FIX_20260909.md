# Netlify `.env.example` self-healing repair — 2026-09-09

## Failure observed
Netlify quality gate reached the database provider policy and failed with `ENOENT` while opening `.env.example`. The tracked fallback `env.example.template` was present, but the hidden `.env.example` file can be lost by some upload/extraction paths.

## Repair
- Added `environment example contract` as an early step in `scripts/production-quality-gate.mjs`.
- Strengthened `prequality:gate` to restore both `.npmrc` and `.env.example`.
- Updated the Netlify build command to run `ensure:env-example` before preflight and quality gates.
- `.env.example` is restored from the non-hidden tracked `env.example.template`, so hidden-file loss no longer blocks database provider verification.

## Verification
The repair was tested after deliberately deleting `.env.example`: the ensure script recreated it and the database provider policy passed.
