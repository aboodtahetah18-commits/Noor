# P43.6 — Account multiplicity + custom combobox

- Removed active account-name uniqueness. Account name is now a label, not an identity.
- Multiple accounts are allowed within the same bank and across different banks.
- IBAN remains unique per active user account when present.
- Replaced browser datalist controls with a custom RTL searchable/typable combobox.
- Polished help circles and step circles with subtle cyan/violet accents.
