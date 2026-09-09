# P43.5 — Numeric/UI/Performance Repair

- Help disclosure trigger is now a compact circular control.
- All Intl numeric/date formatting uses Latin digits (`nu-latn`).
- SAR formatting uses `.` decimal separator and Western digits.
- Account creation uses one atomic PostgreSQL CTE statement instead of a multi-statement HTTP transaction.
- Removed redundant onboarding progress write and revalidation after every added account; progress is committed on Continue.
- Onboarding status, account list, and search params load concurrently.
- Mobile money total summary compacted.
