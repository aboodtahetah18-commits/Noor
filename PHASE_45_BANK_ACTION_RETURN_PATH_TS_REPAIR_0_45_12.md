# P45.12 — Bank actions return-path TypeScript repair

- Fixed undefined `returnTo` in `saveMerchantRuleGovernanceAction`.
- `returnTo` is now safely derived from form data and allow-listed to `/merchants` or `/bank-statements`.
- Validation, error and success redirects use the same safe return target.
- No financial calculation or posting behavior was changed.
