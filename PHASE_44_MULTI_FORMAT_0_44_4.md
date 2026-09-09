# P44.4 — Multi-format bank statement intake

- Added CSV + XLSX + XLS upload support.
- Excel parsing uses the first worksheet and routes rows through the same intelligence/review pipeline.
- Expanded Arabic/English Saudi-bank header aliases.
- Preserved review-before-posting, duplicate matching, merchant memory and reconciliation behavior from P44.3.
- No schema migration required: `bank_statement_imports.file_type` already supports XLSX.
