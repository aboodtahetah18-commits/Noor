# TypeScript Build Repair — 0.41.2

This patch addresses the Netlify TypeScript failures exposed after operational staging was enabled.

## Root fixes
- Narrowed the application-facing Neon HTTP query contract to rows arrays because the application never enables `fullResults`.
- Preserved Neon array transaction runtime semantics and removed the unsupported callback transaction usage in recommendation transitions.
- Reworked Better Auth lazy singleton typing so `getAuth()` cannot return null and its type matches the concrete configuration.
- Canonicalized `DATABASEURL` to `DATABASE_URL` before runtime environment validation.
- Changed form server actions used directly by `<form action>` to resolve `void`.
- Fixed noUncheckedIndexedAccess issues in Money and historical analysis.
- Fixed recommendation next-action fallback and mobile navigation union narrowing.
- Pinned dependency versions exactly while the repository still lacks a generated lockfile.

## Integrity
No business formula, financial state transition definition, or database migration was changed by this patch.
