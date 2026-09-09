# Phase 2.1 — Supabase → Neon Migration

Status: IMPLEMENTED IN APPLICATION FOUNDATION

## Adopted stack
- Neon PostgreSQL
- Drizzle ORM
- Better Auth
- Next.js / React / TypeScript

## Removed
- @supabase/supabase-js
- @supabase/ssr
- Supabase client/server helpers
- Supabase proxy session refresh dependency
- Supabase-specific environment variables

## Authentication boundary
- Better Auth owns authentication/session persistence.
- Protected route group still calls requireAuthenticatedUser().
- Root layout remains public and never enforces authentication.
- Application commands must derive authenticated user from server session.

## Database boundary
- DATABASE_URL is server-only.
- Financial schema source-of-truth remains the approved PostgreSQL migrations.
- No financial calculations were moved into Drizzle or Better Auth.

## Live Neon project
- Project name: personal-finance-advisor
- Project ID: restless-dawn-11731417
- PostgreSQL: 18

## Outstanding
Neon Auth provisioning was not applied because the connected tool returned an inconsistent connector schema. The application therefore uses self-hosted Better Auth against Neon PostgreSQL, which keeps authentication provider-independent.

## Security ownership model
The application does not expose a browser database client. All financial reads/writes go through authenticated server operations, which derive the user from the Better Auth session and scope repository queries by user_id. PostgreSQL constraints remain the final integrity layer.

## Verification result
17/17 structural migration checks passed on the application package.
