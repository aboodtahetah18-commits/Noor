# Migration Repair 0.41.6

- Fixed `weekly_analysis_runs.user_id` to UUID for fresh databases.
- Added backward-compatible repair in migration 022 for staging databases where migration 020 was already applied with TEXT.
- RLS owner policy can now compare UUID to UUID.
- Migration runner now owns transaction boundaries and strips legacy outer BEGIN/COMMIT wrappers from migration files.
- Main branch remains untouched; this repair targets staging migration execution.
