import { headers } from 'next/headers';
import { getServerEnv } from '@/config/env';

/**
 * Defense-in-depth CSRF/origin guard for cookie-authenticated mutations.
 * Next.js Server Actions already apply framework protections; this verifies
 * that the browser origin is one of the application's trusted origins too.
 */
export async function assertTrustedMutationOrigin(): Promise<void> {
  const h = await headers();
  const fetchSite = h.get('sec-fetch-site');
  if (fetchSite === 'cross-site') throw new Error('UNTRUSTED_REQUEST_ORIGIN');

  const origin = h.get('origin');
  if (!origin) {
    // Non-browser/internal invocations do not carry Origin. Authentication,
    // ownership and command validation remain mandatory for those paths.
    return;
  }

  let normalized: string;
  try {
    normalized = new URL(origin).origin;
  } catch {
    throw new Error('UNTRUSTED_REQUEST_ORIGIN');
  }

  const trusted = new Set(getServerEnv().TRUSTED_ORIGINS);
  if (!trusted.has(normalized)) throw new Error('UNTRUSTED_REQUEST_ORIGIN');
}
