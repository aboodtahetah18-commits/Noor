# Owner bootstrap — 0.41.5

- Staging deploy now applies pending migrations before `next build`.
- `/login` detects whether `auth.user` is empty.
- With zero users, a one-time owner creation form is shown.
- After first owner exists, the UI returns to sign-in only.
- Public Better Auth signup HTTP endpoints are rejected after owner creation.
- Owner creation redirects to `/onboarding`.
- Minimum owner password length: 12 characters.
- This artifact is staging-only and never targets `main`.
