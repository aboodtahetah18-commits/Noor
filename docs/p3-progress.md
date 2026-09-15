# P3 Financial API Contract

The financial engine is server-authoritative. Client requests never provide `userId`; identity is always derived from the authenticated session.

## Endpoints

- `POST /api/financial-engine/run` — run the full P2 pipeline for an owned cycle.
- `GET /api/financial-engine/current?cycleId=...` — read the latest non-stale engine snapshot and score without recalculation.
- `GET /api/recommendations?cycleId=...` — list recommendations with recommendation-gate metadata.
- `POST /api/decisions/request` — create a decision request from an actionable recommendation; the server derives materiality and honors the recommendation gate.
- `POST /api/decisions/respond` — record the user's explicit APPROVE/REJECT/DEFER/MODIFY decision.
- `GET /api/execution/tasks` — list execution tasks that still require user/system follow-up.
- `POST /api/execution/report` — record an external action performed by the user and attach/reference evidence.

## Security and execution invariants

1. The platform never executes a financial action for the user.
2. `APPROVED` is not execution.
3. Execution begins only after an explicit recorded user approval.
4. User-reported execution cannot mark itself `VERIFIED_EXECUTION`.
5. Evidence remains `PENDING` until an independent verification path matches it.
6. High/critical recommendations cannot bypass `BLOCKED` or conditional revalidation gates.
7. Raw PostgreSQL/provider error messages are not returned to the client.
8. Financial mutation routes require trusted-origin validation and per-user rate limiting.
9. Financial responses are `Cache-Control: no-store`.

## Error taxonomy

Expected client-facing codes map to stable HTTP categories:

- 401 authentication
- 404 owned entity/current state not found
- 409 workflow/rule/gate conflict
- 422 validation or missing evidence
- 500 unavailable/internal system error with safe request ID where applicable

The database remains the source of truth for state-transition enforcement.
