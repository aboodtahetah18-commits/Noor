# Auth Neon Serverless Lifecycle Repair — 0.42.7

- Authentication now uses `Pool` from `@neondatabase/serverless`.
- Every auth request/session operation creates and closes its Pool inside the same invocation.
- Removed node-postgres (`pg`) from the runtime path.
- Financial Neon HTTP access is unchanged.
- This follows Neon serverless lifecycle requirements for WebSocket Pool/Client usage.
