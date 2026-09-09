# Phase 31 — Settings

Status: IMPLEMENTED
Version: 0.31.0

## Delivered
- Profile settings: display name and authenticated email context.
- Currency V1 locked to SAR in UI and persisted profile base currency.
- User timezone setting with IANA validation; default remains Asia/Riyadh.
- Operational dates for expenses, refunds, obligation creation/payment now use the user's timezone.
- Weekly analysis period uses the user's timezone.
- Obligation due/overdue synchronization uses each profile timezone rather than a global hardcoded timezone.
- Settings overview links to canonical Accounts and Budget Categories modules instead of duplicating financial data.
- Recurring obligation templates can be deactivated/reactivated without deleting historical occurrences or payments.
- Mobile/RTL settings layout.

## Invariants
1. Settings never write account balances.
2. Currency V1 is SAR; no runtime currency conversion is introduced.
3. Deactivation replaces destructive deletion for recurring obligation templates.
4. Financial history remains in canonical domain tables.
5. Timezone affects operational date boundaries; it does not rewrite historical DATE values.
