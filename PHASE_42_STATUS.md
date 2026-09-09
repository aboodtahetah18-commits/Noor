# Phase 42 Status — Authentication Stabilization

Version: 0.42.5

## Root fix
- Better Auth no longer uses the Drizzle adapter.
- Authentication now uses Better Auth's built-in PostgreSQL adapter via `pg.Pool`.
- PostgreSQL `search_path` is pinned to the dedicated `auth` schema.
- Existing snake_case auth columns are mapped explicitly.
- Financial data remains on the existing Neon/Drizzle stack; only authentication is isolated.
- First-owner route/database guards remain in place.

## Why
Repeated sign-up failures rolled back before any auth rows were committed even though the Neon schema was present and structurally valid. Removing the Drizzle translation layer eliminates that integration surface for authentication.
