# Auth Diagnostic + Atomic Repair — 0.42.6

- Adds a server-side auth preflight before first-owner signup.
- Validates Neon connectivity and required Better Auth tables/columns.
- Repairs only a provably orphaned owner (1 user, 0 credential accounts, 0 sessions) in one PostgreSQL transaction.
- Wraps Better Auth failures into safe diagnostic codes without exposing secrets, SQL, passwords, or connection strings.
- Owner bootstrap uses direct same-origin fetch so the browser receives the precise diagnostic code and preserves successful session cookies.
