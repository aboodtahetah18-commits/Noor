# P50.1 — ESLint Zero-Warning Repair

Netlify reached the P50 quality gate successfully, then failed at ESLint with exactly 10 warnings from `@typescript-eslint/no-unused-expressions`.

Root cause: `scripts/verify-p50.mjs` used ten standalone conditional-expression statements (`condition ? pass() : fail()`). ESLint treats those as unused expressions under the repository's zero-warning policy.

Repair:
- Replaced all ten conditional-expression statements with explicit `if/else` control flow.
- Kept every P50 acceptance assertion and failure path intact.
- Did not weaken ESLint and did not raise `--max-warnings=0`.
- No application/domain/database behavior changed.
- Migration inventory remains 64.
