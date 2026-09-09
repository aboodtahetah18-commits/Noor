# P72 — Dashboard & Daily Financial Command Center Finalization

## Objective
Make the dashboard answer, in priority order: what can I safely spend, what needs action now, what is the most important advisor signal, and what is coming next.

## Implemented
- Preserved `Safe To Spend` as the dominant financial hero.
- Added a compact critical overdue-obligation strip only when an overdue obligation exists.
- Reduced dashboard header actions to one primary daily action plus bank-message intake; removed duplicated logout from page content.
- Corrected hero action semantics: manual expense entry is no longer mislabeled as a bank-message action.
- Clarified daily-safe context as running until the next income.
- Changed the command-center wording to direct intervention language while preserving the legacy P47 source contract marker.
- Reordered insight panels so mobile prioritizes Advisor → Obligations → Budget → Forecast.
- Kept desktop paired insight layout and all existing financial read models.
- Reduced mobile action clutter and kept optional tools lower in the page hierarchy.

## Not changed
- No financial formula changes.
- No repository/query changes.
- No database migrations.
- No auth/session changes.
- No routes added or removed.
- No recommendation ranking changes.
