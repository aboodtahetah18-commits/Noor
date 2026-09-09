# Dependency Resolution — Netlify ERESOLVE

## Root cause
Netlify npm 11 failed before `next build` while resolving Better Auth's optional SvelteKit peer graph against the project's old Vitest/Vite 7 toolchain.

## Permanent fix
- Keep `better-auth` and `@better-auth/drizzle-adapter` on the same `^1.7.2` line.
- Upgrade `vitest` from `^3.2.4` to `^4.1.0`.
- Declare `vite` explicitly as `^8.2.2`.
- Do NOT add `legacy-peer-deps=true`.
- Do NOT use `--force`.

Vitest 4.1 supports Vite 8; this removes the old Vitest 3 peer ceiling that caused npm ERESOLVE.

## Expected Netlify behavior
Dependency installation must complete before Netlify reaches `next build`. If a subsequent deploy fails, the new failure will be a separate build/runtime issue and must be diagnosed from its first error line.
