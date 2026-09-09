# P61 — Smart Profile & Security Operations — 1.2.0

- Adds an account security center to Settings.
- Shows active-session count, other-session count, current-session lifetime, password credential update date, and email-verification state.
- Adds an authenticated action to revoke every other active session while preserving the current session.
- Adds an authenticated action to remove the stored avatar and return to the default finance logo.
- Uses the existing auth schema; no database migration is required.
- No financial-domain behavior changes.
