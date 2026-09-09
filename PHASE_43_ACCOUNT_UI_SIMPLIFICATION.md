# P43 — Account identity simplification · v0.43.5

- System-wide title explanations are collapsed behind a compact disclosure arrow.
- Account name and account type are merged into one visible field: `اسم الحساب`.
- `اسم الحساب` supports preset selection and free typing; previously saved names become future suggestions.
- Bank is one combobox-style field (`input + datalist`): select a known Saudi bank or type a new institution directly.
- Separate `رقم الحساب` input is removed. When an IBAN is provided, the internal account identifier is derived from the IBAN for matching purposes.
- Only the last four card digits are accepted.
- Account cards show a stable bank identity badge; no remote logo dependency is required.
- Existing storage columns remain compatible; this release requires no destructive database migration.
