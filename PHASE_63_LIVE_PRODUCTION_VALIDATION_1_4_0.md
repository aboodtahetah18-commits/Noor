# P63 — Live Production Validation — 1.4.0

P63 adds a deploy-target acceptance contract that validates liveness, readiness, owner-auth health, unauthenticated route protection, retired legacy auth behavior, and security headers. It also performs safe hostile-Origin POST probes that must be rejected before any mutation occurs.

No financial logic changes. No database schema changes. Migration inventory remains 65.
