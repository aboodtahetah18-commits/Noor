# Netlify Build Fix 3

Version: 0.16.4

- Preview mode bypasses Better Auth session lookup.
- Protected route group is force-dynamic to prevent build-time prerender from entering authenticated pages.
- Server env validation remains strict for real deployments, while PREVIEW_MODE receives non-production placeholders only to keep module initialization/build safe.
- No real DATABASE_URL or BETTER_AUTH_SECRET is embedded.
