# Authentication Direct PostgreSQL Repair — 0.42.5

Better Auth is connected directly to PostgreSQL using `pg.Pool`, with `search_path=auth`. The Drizzle adapter is no longer part of the authentication path. Existing physical snake_case fields are mapped to Better Auth logical field names.
