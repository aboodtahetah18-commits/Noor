# Auth Neon Serverless Pool Repair — 0.42.7

## Root cause
Runtime database reads through `@neondatabase/serverless` succeed on Netlify while authentication preflight through `pg.Pool` returns `AUTH_DB_CONNECTION_FAILED`.

## Fix
- Removed `pg` / node-postgres from the authentication runtime path.
- Better Auth now receives the pg-compatible `Pool` from `@neondatabase/serverless`.
- The existing `auth` schema search_path and explicit snake_case field mappings are preserved.
- Financial queries remain unchanged.
