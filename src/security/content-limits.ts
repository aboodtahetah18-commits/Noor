export const SECURITY_LIMITS = Object.freeze({
  name: 160,
  description: 1_000,
  reason: 1_000,
  search: 120,
  idempotencyKey: 200,
  pageSize: 100,
  requestBodyBytes: 64 * 1024,
});
