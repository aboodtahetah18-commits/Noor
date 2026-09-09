# P45.1 — Daily Bank Operations Center

## Scope
- New `/bank-operations` daily intake center.
- Paste bank SMS/message and reuse the existing safe staging parser.
- Aggregate all `NEEDS_REVIEW` rows across imports in one operational queue.
- Surface duplicate candidates, missing category, confidence, active funding context.
- Preserve read/write separation: center queries are read-only; imports/review/approval remain explicit commands.
- No financial transaction is created by merely opening the center or pasting a message. Pasted messages enter review staging first.
- Funding linkage still occurs only after the authoritative POSTED transaction is created during explicit import approval.

## Safety
- No automatic category/funding approval for pasted SMS.
- No duplicate financial effect.
- Existing bank statement review remains the authoritative confirmation surface.
