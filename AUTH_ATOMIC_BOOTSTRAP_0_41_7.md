# Auth atomic bootstrap repair — 0.41.7

- Better Auth ORM connection moved from `drizzle-orm/neon-http` to transaction-capable `drizzle-orm/neon-serverless` using Neon `Pool`.
- `drizzleAdapter(..., { transaction: true })` makes owner signup atomic.
- Application `rawSql` remains on Neon HTTP for ordinary financial queries.
- Migration 024 removes only incomplete auth users that have neither an auth account nor a session. This repairs the partial staging owner created by the earlier failed signup.
- Main is not modified by this artifact; migration runs only where the artifact is deployed with staging migration enabled.
