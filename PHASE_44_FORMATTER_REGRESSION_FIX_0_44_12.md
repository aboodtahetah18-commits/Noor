# P44 Formatter Regression Fix — v0.44.12

- Fixed stale `formatMoney` import in cycle monthly review.
- Canonical formatter is `formatSar`.
- Added `formatMoney = formatSar` compatibility alias to prevent older feature modules from breaking builds.
- No database migration.
