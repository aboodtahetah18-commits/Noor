# Release 0.48.8

## Fixed
- Netlify Vitest gate: 4 contract failures.
- Removed unapproved `WALLET` account type from runtime/domain validation.
- Restored explicit atomic account bootstrap transaction contract.
- Restored advisor no-auto-financial-write UX guarantee.
- Restored AI-optional environment contract.

## Verification
- P48.8 regression verifier: PASS.
- P48.3/P48.4 structural verifier: PASS.
- P48.1/P48.2 verifier: PASS.
- Route integrity: PASS (66 pages / 124 static internal links).
- P47 closure: PASS (62 protected pages).
- Migrations: 64.

Full Vitest/Next build remains authoritative on Netlify because this package intentionally ships without `node_modules`.
