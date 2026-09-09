# P44.9 — Rule Governance & Semi-Automatic Approval

- Manual merchant rules are authoritative over heuristic learning.
- Each rule has approval mode: AUTO / REVIEW / CONFIRM.
- Rule priority and optional internal-transfer target account are persisted.
- Review rows expose a decision reason.
- Rule management is available from the bank-statement center.
- Migration: 035_bank_rule_governance.
