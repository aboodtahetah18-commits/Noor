# P60.1 — TypeScript File Narrowing Repair — 1.1.1

Netlify reached TypeScript after the P60 quality gates and rejected the avatar action because the helper wrapping `next/navigation` `redirect()` was not explicitly typed as non-returning.

Fix:
- `redirectSecurityResult(...): never` now expresses the real control-flow contract.
- This preserves TypeScript narrowing from `FormDataEntryValue` to `File` after the avatar validation guard.
- No authentication behavior, upload policy, UI, financial logic, database schema, or migration changed.
- P60 version verification now accepts compatible 1.1.x+ releases.

Migration inventory remains 65.
