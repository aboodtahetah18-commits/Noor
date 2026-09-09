# P44.8 — XLSX Parser Regression Fix

- Rebased on P44.7 while preserving P44.6/P44.7 features.
- Replaced direct RegExp capture indexing in XLSX parser with safe capture helpers.
- Added BANK_FILE_PARSER_REVISION = 0.44.8-safe-capture for deployment verification.
- Prevents TS18048 under strict + noUncheckedIndexedAccess.
