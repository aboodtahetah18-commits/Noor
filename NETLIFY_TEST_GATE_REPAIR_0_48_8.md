# Netlify Test Gate Repair — v0.48.8

Resolved the four Vitest failures reported after lint and typecheck passed.

1. Account type contract restored to V1 authoritative vocabulary: `BANK`, `SAVINGS`, `CASH`, `OTHER`.
2. Account creation and opening balance insertion now execute through `rawSql.transaction(...)`.
3. Advisor details explicitly state that accepting a recommendation does not execute financial writes.
4. `.env.example` explicitly states financial operations remain fully usable without OpenAI.

A dedicated regression verifier (`verify:p48-8`) prevents these four contracts from silently regressing.

No database migration was added. Migration count remains 64.
