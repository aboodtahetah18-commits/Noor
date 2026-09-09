# Mustaqbali — Accounts Visual Reconstruction Phase 7
Date: 2026-09-09

## Root causes corrected
- Mobile onboarding hid the global top bar but the protected shell still reserved its height, producing an empty band above content.
- The legacy onboarding progress block used a primary background with primary-colored text, rendering as an unexplained blue rectangle.
- SmartComboInput rendered its dropdown trigger as a separate circular control, visually competing with the input.
- Core fields were cramped while optional bank matching occupied too much visual weight.
- The later Add Account dialog used a different two-tab interaction, creating inconsistent account-entry UX.

## New governed account pattern
- No redundant onboarding progress rectangle.
- Compact Home utility + step count at the top.
- Clear financial hero with wallet icon, page title, total amount and account count.
- On mobile: account name and bank use full width; opening balance remains on the right and effective date on the left.
- SmartComboInput now uses a borderless governed chevron only.
- Bank matching is collapsed, compact and explicitly optional.
- Added-account cards have stronger identity/balance hierarchy.
- The standalone Add Account dialog now uses the same basic-first / optional-matching hierarchy instead of a separate two-tab flow.

## Systemic effect
The SmartComboInput change is shared, so account-name/bank dropdowns across the platform inherit the cleaner chevron interaction automatically.

## Regression protection
Added `tests/integration/onboarding-accounts-visual-contract.test.ts` to prevent return of:
- the mystery progress rectangle,
- pill-style combo toggles,
- oversized optional matching,
- reserved invisible mobile-header space,
- the obsolete tabbed account-create flow.

## Static verification
- Lucide icon contract: PASS
- Project execution contract: PASS
- Design system contract: PASS
- UI token compliance: PASS (350 files)
- Mobile overflow contract: PASS (63 protected routes)
- Route integrity: PASS (67 pages / 124 static links)
- Database provider policy: PASS
- Dependency policy: PASS
- Security boundary: PASS (29 protected action modules / 428 files)
- Runtime surface: PASS (11 required surfaces / 66 migrations)
- Regression contract: PASS (80 regression test files)

`package-lock.json` remains absent from the supplied project and is therefore still reported as a non-blocking reproducibility warning by the repository policy.
