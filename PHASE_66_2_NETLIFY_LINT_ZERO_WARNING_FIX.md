# P66.2 — Netlify lint zero-warning fix

## Issue
Netlify quality gate failed at lint because `accounts` in `src/app/(protected)/bank-operations/page.tsx` was assigned but no longer used after bank-message entry was moved to `BankMessageDialogTrigger`.

## Fix
- Removed the stale `listAccounts` import.
- Removed `listAccounts(user.id)` from the page `Promise.all`.
- Removed the unused `accounts` binding.
- Kept the bank-message modal implementation unchanged.
- No business logic, route, database, or authentication behavior changed.

## Expected result
`@typescript-eslint/no-unused-vars` warning for `accounts` is eliminated, allowing the zero-warning lint quality gate to proceed.
