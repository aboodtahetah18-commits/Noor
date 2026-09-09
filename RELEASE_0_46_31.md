# Release 0.46.31

## Added
- P46.30: unified future financial pressure across obligations, internal recovery, approved goal contributions, and upcoming trip deadlines.
- P46.31: deterministic first-pressure detection without arbitrary risk thresholds.
- New report page: `/reports/future-pressure`.

## Financial integrity
- Trip deadline gaps are shown separately from committed outflow so goal contributions are not double-counted.
- Future income uses the active cycle expected income only as an explicit baseline assumption.
- No future cycle, plan, reservation, transfer, or transaction is created by this report.

## Database
- No migration required. Migration count remains 60.
