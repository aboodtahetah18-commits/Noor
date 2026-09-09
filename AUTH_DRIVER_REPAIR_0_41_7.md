# Auth Driver Repair — 0.41.7

- Better Auth no longer uses Drizzle neon-http.
- Financial repositories remain on Neon HTTP.
- Better Auth uses postgres-js + drizzle-orm/postgres-js with adapter transactions enabled.
- Owner bootstrap detects the exact partial state: one user, zero accounts, zero sessions.
- Recovery only removes that orphan after the same email is submitted and no operational finance rows exist.
- Completed owner accounts are never deleted by recovery.
