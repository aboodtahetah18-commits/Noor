# Phase 2 — Authentication Status

## Status

Implemented structurally and ready for dependency/runtime verification against a configured Supabase project.

## Implemented

- Supabase SSR browser client.
- Supabase SSR server client using cookie storage.
- Next.js 16 `proxy.ts` token refresh boundary.
- Verified-claims based user resolution.
- Central `getAuthenticatedUser()` and `requireAuthenticatedUser()` helpers.
- Public route group for `/login`, `/auth/callback`, and `/auth/error`.
- Protected route group for authenticated application pages.
- Root route redirects by session without placing auth enforcement in the root layout.
- Password sign-in for the private V1 owner account.
- Server-side sign-out.
- Safe internal `return_to` handling to prevent open redirects.
- Auth/security contract tests.

## Redirect-loop prevention

Authentication enforcement is intentionally NOT placed in `src/app/layout.tsx`. The proxy refreshes session cookies but does not perform blanket route redirects. Only `src/app/(protected)/layout.tsx` requires an authenticated user. Public auth routes therefore remain reachable when no session exists.

## V1 account provisioning

The product is private/single-owner. Phase 2 exposes sign-in, not public self-registration. The owner account should be provisioned through the trusted Supabase administrative path for the target environment.

## Environment contract

Required for normal application auth:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `APP_ENV`
- `APP_BASE_URL`

`SUPABASE_SERVICE_ROLE_KEY` is server-only and optional until a specific administrative server operation requires it.

## Runtime verification boundary

The current execution environment may not contain pnpm or a configured Supabase project. Structural tests are included, but live sign-in/session refresh must also be validated in Development/Staging with real environment credentials before Phase 2 is marked production-verified.

## Next phase

Phase 3 — Domain Types.
