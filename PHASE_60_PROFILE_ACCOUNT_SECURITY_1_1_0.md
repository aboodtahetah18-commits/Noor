# P60 — Profile & Account Security Completion — 1.1.0

- Local avatar upload stored in existing auth.user.image with 128KB cap and PNG/JPEG/WebP allowlist.
- Email change requires the current password and marks the new email as unverified.
- Password change requires the current password, minimum 12 characters, and revokes all other sessions while preserving the current session.
- No new database migration; existing auth columns are reused.
- No financial-domain changes.
