# Netlify Preview Recovery

## Purpose
This deployment profile exists only to review the UI while the financial backend is still under construction.

## Isolation guarantees
- `PREVIEW_MODE=true` is set by `netlify.toml`.
- `/` redirects to `/preview` without importing Better Auth or querying Neon.
- `/preview` is a static design-only route with sample data.
- Preview builds may ignore TypeScript errors from unfinished vertical slices; production builds do not.
- No database migration is executed during build.
- No secret is embedded in the preview page.

## Exit condition
Before production release, remove preview mode and require a clean full typecheck/build against a migrated Neon branch.

## 2026-09-02 dependency resolution update
Netlify install failure `ERESOLVE` was traced to Vitest 3 / Vite 7 incompatibility with Better Auth's optional SvelteKit peer graph. The project now uses Vitest 4.1 + Vite 8 and does not use `legacy-peer-deps`.
