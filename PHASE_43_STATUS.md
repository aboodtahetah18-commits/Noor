# Phase 43 — Neon HTTP Authentication

Version: 0.43.1

## Root-cause repair
- Neon HTTP health was already passing in production.
- Owner creation failed because the live `auth.account` schema requires `issuer` while v0.43.0 omitted it.
- Credential accounts now persist `issuer = local:credential`.
- Login requires both `provider_id = credential` and `issuer = local:credential`.
- Health checks now verify the `issuer` column.
- Migration 026 normalizes the schema and creates the issuer/account identity index.

## Runtime
- Authentication remains fully on Neon HTTP.
- No TCP Pool or WebSocket Pool is used for authentication.
- Session cookie remains HttpOnly/SameSite and Secure in production.


## v0.43.6
- Multiple same-name accounts allowed across and within banks.
- IBAN is the active identity constraint.
- Browser datalists replaced by custom RTL searchable comboboxes.
- Help/step micro-circles polished with subtle accent gradients.
