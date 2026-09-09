type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Best-effort per-instance limiter. It is defense-in-depth only; idempotency
 * and DB constraints remain authoritative. Production can replace this with a
 * shared store without changing command contracts.
 */
export function enforceRateLimit(key: string, limit = 60, windowMs = 60_000): void {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) throw new Error('RATE_LIMITED');
  current.count += 1;
}
