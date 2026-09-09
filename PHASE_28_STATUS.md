# Phase 28 — Historical Analysis

Status: IMPLEMENTED
Version: 0.28.0

Implemented:
- 3 / 6 closed-cycle analysis windows.
- Snapshot-only history source inherited from ReportRepository.
- Deterministic averages using Money/halalas, not JS floating point.
- Trends for income, expense, saving, surplus, deficit, end balance.
- Recurring signals across available closed cycles.
- No fake full-window claim when fewer cycles exist.
- RTL historical-analysis UI.
- Contract tests for no-fake-history and trend direction.

Invariant:
Historical analysis never reads live transactions to reconstruct a CLOSED cycle.
