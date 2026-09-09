# P43 — Onboarding Operational Flow

Version: 0.43.2

## Implemented
- WF-001 through WF-006 are connected to persisted Neon data.
- Onboarding resumes from the correct incomplete step.
- Account step requires at least one account.
- Income step creates the first DRAFT financial cycle and expected income atomically.
- Obligation review is explicitly recorded even when no obligation is added.
- Controls review is explicitly recorded.
- First financial plan is now created and approved inside WF-006 against the DRAFT onboarding cycle.
- Finalization activates the first cycle only after the plan is ACTIVE_PLAN.
- Main desktop/tablet/mobile navigation is hidden during onboarding so the wizard remains focused.
- Completing onboarding redirects to the operational dashboard.
