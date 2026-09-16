export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { verifyEmailAndIssuePasswordSetup } from '@/lib/auth/auth-lifecycle';
import { authAbsoluteUrl } from '@/lib/auth/auth-email';
import { enforceRateLimit } from '@/security/rate-limit';

export async function GET(request: Request) {
  try { enforceRateLimit('auth-verify-email', 20, 60_000); } catch {
    return NextResponse.redirect(authAbsoluteUrl('/auth/error?code=AUTH_RATE_LIMITED'));
  }
  const token = new URL(request.url).searchParams.get('token') ?? '';
  try {
    const result = await verifyEmailAndIssuePasswordSetup(token);
    if (!result.ok) return NextResponse.redirect(authAbsoluteUrl(`/auth/error?code=${result.code}`));
    return NextResponse.redirect(authAbsoluteUrl(`/set-password?token=${encodeURIComponent(result.setupToken)}`));
  } catch (error) {
    console.error('[auth-verify-email]', { name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.redirect(authAbsoluteUrl('/auth/error?code=AUTH_VERIFICATION_FAILED'));
  }
}
