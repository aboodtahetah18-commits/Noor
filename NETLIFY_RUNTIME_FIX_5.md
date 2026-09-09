# Netlify Runtime Fix 5

## Symptom
Deploy completed, but opening the site root returned a server-side runtime error.

## Root cause
The preview decision on `/` depended on `process.env.PREVIEW_MODE` at request runtime. The build environment had the flag, but the deployed runtime was not guaranteed to receive it. When absent, `/` fell through to Better Auth and database initialization.

## Fix
- `/` now redirects unconditionally to `/preview` in this preview-only artifact.
- Added a Netlify root redirect `/ -> /preview` so the redirect happens before Next.js runtime.
- The root route no longer imports or initializes Better Auth or Neon.
- Production application behavior is intentionally not represented by this preview artifact.

Version: 0.16.6
