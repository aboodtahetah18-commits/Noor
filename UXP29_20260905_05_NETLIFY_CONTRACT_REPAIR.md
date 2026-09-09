# UXP29-20260905-05 — Netlify Contract Repair

Scope: build-gate repair only after the UXP29-20260905-04 Netlify test failure.

- Restores historical exact-string contract compatibility without changing the approved runtime UX.
- Keeps the canonical 767/768/1023/1024 responsive contract.
- Keeps the systemic mobile-header RTL overflow fix.
- Removes `body{overflow-x:hidden}` from responsive shells so overflow is not hidden.
- Token compliance now ignores block comments, which are non-executable source.
- No business logic changes.
- No identity/feature changes.
