# Netlify `.env.example` Resilience Repair — v0.48.9

## Root cause

The AI explanation structure test reads `.env.example` from the repository root. The file existed in the source package, but the Netlify build that received the repository did not contain it, causing `ENOENT` before the content assertions could run.

## Repair

- Retained the canonical `.env.example` file.
- Added non-hidden `env.example.template` with the same non-secret example configuration.
- Added `scripts/ensure-env-example.mjs`.
- `npm test` now runs the ensure script before Vitest.
- If `.env.example` is present and valid, nothing changes.
- If it is absent, it is recreated deterministically from the tracked non-hidden template.
- The generated example contains both required contract strings:
  - `OPENAI_API_KEY=`
  - `Financial operations remain fully usable`

## Regression simulation

The repair was verified by deleting `.env.example` locally, running the ensure script, and confirming that the file was recreated with the required AI-optional contract.

## Safety

No production secret is generated or copied. The template contains placeholders only. No financial logic, database schema, authentication behavior, or migration was changed.
