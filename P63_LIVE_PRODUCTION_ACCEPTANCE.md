# P63 — Live Production Acceptance

## Purpose
P63 adds a read-only/non-destructive live acceptance suite for the deployed HTTPS origin.

## Command

```bash
npm run ops:live-validate -- https://YOUR-SITE.netlify.app
```

Machine-readable output:

```bash
npm run ops:live-validate -- https://YOUR-SITE.netlify.app --json
```

Write a JSON acceptance artifact:

```bash
npm run ops:live-validate -- https://YOUR-SITE.netlify.app --report=live-production-acceptance.json
```

## Acceptance checks
- `/api/health` is HTTP 200, `status=ok`, and `Cache-Control: no-store`.
- `/api/ready` is HTTP 200, `status=ready`, `database=reachable`, and no-store.
- `/api/auth-owner/health` is HTTP 200 with `AUTH_HTTP_OK`.
- `/login` is publicly reachable.
- `/` resolves only to an expected login/dashboard entry state.
- Production security headers are present.
- Protected routes redirect unauthenticated requests to `/login`.
- Legacy `/api/auth/*` runtime remains retired with HTTP 410.
- Login/register mutation endpoints reject an intentionally hostile Origin with HTTP 403 before processing credentials.

## Safety
The suite never submits a trusted mutation. Its only POST probes use a deliberately invalid external Origin and must be rejected by the origin guard before any authentication or database mutation is attempted.

## Release rule
A live release is accepted only when the command exits zero and reports `LIVE-PRODUCTION-VALIDATION-PASS`. A build-time verifier confirms the contract exists, but it does not pretend that an undeployed URL has been live-tested.
