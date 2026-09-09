# P56.2 — Forecast Type Export Repair — 0.56.2

Netlify TypeScript reached `src/forecast/index.ts` and found a stale type export: `ForecastBlockedResult`.
P56 finalized the forecast runtime to the resolved V1 contract, so `src/forecast/types.ts` now exposes `ForecastResolvedResult` and `ForecastResult` only.

Repair:
- removed the stale `ForecastBlockedResult` re-export from `src/forecast/index.ts`;
- did not reintroduce the old blocked/pending forecast contract;
- did not change forecast calculations, financial rules, schema, or migrations.

Migration inventory remains 64.
