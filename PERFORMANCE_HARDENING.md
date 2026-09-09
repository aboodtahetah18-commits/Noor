# Phase 38 — Performance Hardening

## Scope
Measured/reviewed read paths: Dashboard, Transactions, Obligations, Goals, Advisor, Reports.

## Changes
- Removed Goal list N+1: capacity context is fetched once per list, not once per goal.
- Goal details now use direct ID lookup instead of loading the entire goal list and finding one row.
- Recommendation Rule Engine inserts candidates in one set-based batch instead of one INSERT per candidate.
- Preserved transaction-history pagination and its maximum page-size guard.
- Added targeted PostgreSQL indexes for cycle-scoped posted transactions, expected income, budget allocations, open obligations, immutable category snapshots, and open advisor feed.
- Existing Dashboard and Report independent aggregates continue to execute concurrently with Promise.all.

## Safety
- No financial formula changed.
- No state transition changed.
- No historical data retention changed.
- Index migration is append-only and uses IF NOT EXISTS.

## Production measurement gate
Structural optimization is complete, but real latency must be measured against the Neon preview/staging dataset after migrations are applied. Record p50/p95 for the six Phase-38 routes before Production Release. Do not claim a millisecond target from this local environment because it has no representative database dataset/latency.
