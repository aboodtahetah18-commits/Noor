# P44.6 — PDF + Saudi Bank Adapters + Message Intelligence

Version: 0.44.6

## Delivered
- Text-based PDF statement ingestion without OCR.
- Conservative PDF text extraction; unreadable/image PDFs are rejected rather than guessed.
- Saudi bank adapter layer for common bank names and description cleanup.
- Banking-message parser with amount, direction, kind, date, bank and card-last4 detection.
- Automatic account resolution from card last4 / bank identity where unambiguous.
- MESSAGE source type in bank_statement_imports (migration 033).
- Unified downstream enrichment: merchant rules, duplicate detection, internal transfers, approval and reconciliation.

## Safety / accuracy
- PDF rows remain review-first.
- Ambiguous account identification does not guess.
- Existing CSV/XLSX flows are unchanged and continue through the same normalized review pipeline.
