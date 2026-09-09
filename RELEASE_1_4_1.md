# Release 1.4.1

P63 live-production validation regression-contract compatibility repair.

- Fixes the stale literal assertion in `live-production-validation-contract.test.ts`.
- Requires the real `readyBody?.database === 'reachable'` readiness assertion in the P63 verifier.
- No runtime, financial, schema, or migration changes.
