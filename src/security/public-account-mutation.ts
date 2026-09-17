import { createHash } from 'node:crypto';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';

type PublicAccountGuardOptions = {
  limit?: number;
  windowMs?: number;
  requireTrustedOrigin?: boolean;
};

function requestFingerprint(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const source = forwarded || realIp || 'unknown';
  return createHash('sha256').update(source).digest('hex').slice(0, 24);
}

/**
 * Defense-in-depth guard for unauthenticated account lifecycle endpoints.
 * The rate-limit key never stores a raw client IP. This remains an in-memory,
 * per-instance limiter; provider-level/shared limiting can be added later
 * without changing the route contract.
 */
export async function guardPublicAccountRequest(
  request: Request,
  scope: string,
  options: PublicAccountGuardOptions = {},
): Promise<void> {
  if (options.requireTrustedOrigin !== false) {
    await assertTrustedMutationOrigin();
  }

  const fingerprint = requestFingerprint(request);
  enforceRateLimit(
    `public-account:${scope}:${fingerprint}`,
    options.limit ?? 8,
    options.windowMs ?? 15 * 60_000,
  );
}

export function publicAccountGuardError(error: unknown): { status: number; code: string } | null {
  const message = error instanceof Error ? error.message : '';
  if (message === 'RATE_LIMITED') return { status: 429, code: 'AUTH_RATE_LIMITED' };
  if (message === 'UNTRUSTED_REQUEST_ORIGIN') return { status: 403, code: 'AUTH_UNTRUSTED_ORIGIN' };
  return null;
}
