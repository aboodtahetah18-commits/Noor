# MUSTAQBALI CR-002 — P50 Contract Repair

Build ID: MUSTAQBALI_CR002_20260906_02

## Root cause
Netlify failed at P50 because `scripts/verify-p50.mjs` still enforced the legacy mobile Add/Quick-Add entrypoint inside `mobile-bottom-nav.tsx`.

CR-002 intentionally governs the mobile bottom navigation as exactly five destinations:
1. الرئيسية
2. الحركة
3. التخطيط
4. المستشار
5. المزيد

CR-002 also requires a primary financial add action to be a full-page flow, not a quick-add bottom-nav destination.

## Repair
No UX/UI or business behavior was changed.

The stale P50 quality-gate assertion was updated to verify the actual CR-002 implementation:
- the full-page `/expenses` route exists, and
- the Dashboard exposes a real `href="/expenses"` primary financial entrypoint.

The P50 log label remains `mobile add entrypoint`.

## Verification
- P50 full-system acceptance: PASS
- P51 production closure: PASS
- Route integrity: PASS — 67 pages / 120 static internal links
- CR-002 implementation readiness: PASS
- UI Token Compliance: PASS — 337 UI source files
- No Business Logic change
- No Design Token change
- No UX/UI change
- No new feature
