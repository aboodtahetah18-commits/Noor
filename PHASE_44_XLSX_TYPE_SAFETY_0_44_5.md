# P44.5 — XLSX Type Safety Fix

- Fixed TS18048 in `src/features/bank-statements/services/file-parser.ts`.
- Guarded all regex capture groups used by XLSX XML parsing with safe empty-string fallbacks.
- Hardened shared-string, row, cell-attribute, and cell-body parsing for `noUncheckedIndexedAccess`.
- No database migration added.
