# Phase 3 — Domain Types Status

## Status

IMPLEMENTED LOCALLY

## Scope completed

- Central immutable vocabularies and TypeScript union types for all approved V1 domain states/classifications.
- No magic lowercase/alternate status strings introduced.
- Runtime membership guard for boundary validation.
- Unit tests pin authoritative values to source documents.
- No unresolved formula or threshold was invented.

## Explicitly not decided in Phase 3

- `AT_RISK` numerical trigger remains pending (`PENDING-BR-003`).
- Financial Health Score states/formula remain pending.
- Safe To Spend has only `AVAILABLE | ZERO`; no `LOW | CRITICAL` thresholds were added.
- Emergency coverage-month states remain pending.
- Forecast formula remains pending.

## Neon database note

The Neon project exists, but application of the database schema remains intentionally deferred because the Neon connector's branch-creation action currently rejects the documented camelCase arguments while its backend expects snake_case. No schema was written directly to the main branch as a workaround.

## Next phase

Phase 4 — State Machine Engine.
