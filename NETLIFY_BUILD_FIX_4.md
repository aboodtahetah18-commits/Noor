# Netlify Build Fix 4

## Root cause
The Next.js build completed successfully, but Netlify failed after build because the configured publish directory resolved to the same directory as the site base directory.

## Fix
- Explicitly set `publish = ".next"` in root `netlify.toml`.
- Keep `command = "npm run build"`.
- Do not pin or manually configure `@netlify/plugin-nextjs`; allow Netlify/OpenNext automatic handling.
- Version bumped to 0.16.5.
