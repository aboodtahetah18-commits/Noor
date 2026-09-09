# Netlify Theme Preference Typecheck Repair — 2026-09-08

## Failure addressed
Netlify production quality gate stopped at TypeScript typecheck because a generic `string` value was used to index a `Record<ThemePreference, ...>` map.

## Root cause
Browser storage APIs return `string | null`. A stored theme value therefore must not be used as a trusted `ThemePreference` until it has been validated and narrowed.

## Repair
`src/app/theme-toggle.tsx` now:

- exports an explicit `ThemePreference` union.
- validates storage values with the `isThemePreference` type guard.
- converts invalid or missing stored values to the safe `light` default.
- keeps `THEME_STATES` typed as `Record<ThemePreference, ...>`.
- only indexes `THEME_STATES` with a value already narrowed to `ThemePreference`.

This removes the unsafe string indexing path reported by Netlify while preserving the existing light/dark behavior.
