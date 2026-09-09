# Netlify DATABASEURL compatibility fix

The application now accepts either `DATABASE_URL` or `DATABASEURL`.

Precedence:
1. `DATABASE_URL`
2. `DATABASEURL`

The alias is supported consistently by staging preflight, runtime DB client, environment validation, Drizzle configuration, and the staging migration runner.
