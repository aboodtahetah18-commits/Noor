# P69 — Onboarding Simplification

## Status
SOURCE IMPLEMENTATION COMPLETE

## Objective
Reduce first-run cognitive load without changing financial rules, database behavior, authentication, or route structure.

## Changes
- Clarified required vs optional onboarding work on the welcome screen.
- Fixed onboarding step navigation active-state detection and added `aria-current="step"`.
- Accounts step:
  - emphasized the minimum requirement of one account;
  - moved IBAN/card matching fields into an optional expandable section.
- Income step:
  - separated cycle setup from primary-income setup with explicit fieldsets.
- Obligations step:
  - made review/skip the primary path;
  - moved obligation creation into an expandable secondary section.
- Controls step:
  - made emergency/goals setup explicitly optional;
  - surfaced direct continuation to the first plan as the primary path.
- First-plan step:
  - added visible states for build, review/approve, and finish;
  - translated allocation type codes to Arabic labels in the review table;
  - simplified the final completion state.
- Standardized onboarding primary buttons to `primary-button`.
- Added mobile-responsive styles for the simplified onboarding patterns.

## Non-goals
- No database migration.
- No change to business rules.
- No route removal/addition.
- No authentication change.
- No global redesign outside onboarding.

## Static verification
- UI pages discovered: 67
- Route integrity: PASS
- P64 final closure contract: PASS
- Package version retained: 1.5.0

## Runtime verification
Authenticated visual regression on Netlify is required after deployment, especially for mobile onboarding and expandable sections.
