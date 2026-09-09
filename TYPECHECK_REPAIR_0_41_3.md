# Typecheck Repair 0.41.3

Fixed the final null-safety errors reported by the Netlify TypeScript build in `dashboard-repository.ts`.

`calculatePercentage()` intentionally returns `PercentageResult | null`; dashboard utilization now handles the nullable result explicitly in both live and closed-cycle paths.

No financial formula or business rule changed.
