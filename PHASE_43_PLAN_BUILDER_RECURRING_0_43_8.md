# P43.8 — Plan Builder & Recurring Rules

- WF-006 no longer shows onboarding statistics.
- Previous onboarding steps are reachable from a compact step navigation.
- Income/cycle can be edited before plan approval.
- Account edit buttons remain available from WF-002.
- Plan items are added through a modal and rendered as a table.
- Each item stores a recurrence rule: monthly, every N cycles, one-time, or seasonal.
- Migration 029 adds `plan_item_rules`.
- Recurrence dates are anchored to the financial-cycle start date, not calendar month boundaries.
- Seasonal items remain review-driven until a later seasonal month-window UI is configured.
