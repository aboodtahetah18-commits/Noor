# Auth WebSocket Runtime Repair — 0.42.8

- Pins `ws` explicitly as Neon Serverless WebSocket constructor.
- Forces `/api/auth/[...all]` to the Node.js runtime and dynamic execution.
- Keeps auth Pool lifecycle request-scoped and closes it after each handler.
- Browser network-level failures are now labeled `AUTH_ROUTE_UNREACHABLE`, not database connection failures.
