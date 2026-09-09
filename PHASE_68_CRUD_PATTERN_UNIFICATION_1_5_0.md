# P68 — CRUD Pattern Unification

## Status
SOURCE IMPLEMENTATION COMPLETE

## Objective
Unify simple create/operational actions around a modal-first pattern while preserving existing routes as compatibility redirects.

## Changes
- Added `defaultOpen` support to the shared `ActionDialog`.
- Canonical simple actions now open inside the parent resource page:
  - Accounts: add account
  - Budget categories: add category
  - Income: record received income
  - Obligations: add obligation
  - Savings: transfer to savings
  - Emergency: configure, contribute, withdraw
- Existing dedicated routes remain valid and now redirect to the canonical page with the appropriate action query.
- Complex edit/detail routes remain dedicated pages.

## UX rule established
- Simple create/action = modal on the resource page.
- Complex edit/detail = dedicated route where already justified.
- Legacy direct links remain functional through redirects.

## No changes
- No financial calculation changes.
- No database schema changes.
- No authentication changes.
- No route deletion.
