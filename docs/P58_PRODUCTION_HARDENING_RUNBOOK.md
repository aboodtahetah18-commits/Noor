# P58 — Production Hardening Runbook

## 1. Post-deploy operational gate
After Netlify publishes the production candidate, run:

```bash
npm run ops:hardening -- https://YOUR-SITE.netlify.app
```

This chains the existing non-mutating smoke, status, and multi-sample stability checks. Any non-zero result blocks production acceptance.

## 2. Backup and restore policy
P58 does not create an application-level ad-hoc dump of sensitive financial data. Backup/point-in-time recovery remains a database-platform responsibility. The operational requirement is:

1. Confirm the Neon project has an available backup/PITR or branch-restore mechanism appropriate to the subscribed plan.
2. Restore or branch from the backup into a **disposable non-production database**.
3. Set `RECOVERY_DATABASE_URL` to that restored target.
4. Keep `DATABASE_URL`/`DATABASEURL` pointed at production so the preflight can prove the two targets differ.
5. Run:

```bash
npm run ops:recovery-preflight
```

The recovery preflight performs **read-only** validation: 66 migrations, critical schema objects, transaction/snapshot/audit readability, and explicit refusal to operate on the production database URL.

## 3. UAT gate
Execute `docs/P58_UAT_MATRIX.md` with an authenticated user against a disposable/staging dataset or explicitly approved production test dataset. Structural automated tests protect the wiring, but live authenticated UAT must not be falsely reported as executed from an environment that has no browser session.

## 4. Performance gate
The repository retains bounded pagination, concurrent aggregate reads, and Phase-38 hot-path indexes. After deploy, capture real production/staging latency for Dashboard, Transactions, Obligations, Goals, Advisor, and Reports. Any sustained 5xx, timeout, or material regression blocks closure.

## 5. Recovery acceptance
Recovery is accepted only when the restored target:
- contains all 66 migrations,
- exposes the critical financial tables,
- can read transactions, immutable cycle snapshots, and state transition logs,
- is demonstrably not the production database URL.

No restore test is allowed to overwrite the production database.
