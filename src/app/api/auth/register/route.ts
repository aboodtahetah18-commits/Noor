export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { beginRegistration } from '@/lib/auth/auth-lifecycle';
import { authAbsoluteUrl, sendAuthEmail } from '@/lib/auth/auth-email';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';

export async function POST(request: Request) {
  try { await assertTrustedMutationOrigin(); } catch { return NextResponse.json({ code: 'AUTH_ORIGIN_REJECTED' }, { status: 403 }); }
  try { enforceRateLimit('auth-register', 6, 60_000); } catch { return NextResponse.json({ code: 'AUTH_RATE_LIMITED' }, { status: 429 }); }
  if (!process.env.RESEND_API_KEY?.trim() || !process.env.AUTH_EMAIL_FROM?.trim()) {
    return NextResponse.json({ code: 'AUTH_EMAIL_NOT_CONFIGURED' }, { status: 503 });
  }

  let body: { name?: unknown; email?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'AUTH_INPUT_INVALID' }, { status: 400 }); }

  try {
    const result = await beginRegistration({ name: String(body.name ?? ''), email: String(body.email ?? '') });
    if (!result.ok) return NextResponse.json({ code: result.code }, { status: 400 });
    if (result.deliver) {
      const url = authAbsoluteUrl(`/api/auth/verify-email?token=${encodeURIComponent(result.token)}`);
      await sendAuthEmail({ to: result.email, kind: 'verify-email', url }).catch((error) => {
        console.error('[auth-register-email]', { name: error instanceof Error ? error.name : 'UnknownError' });
      });
    }
    return NextResponse.json({ ok: true, code: 'AUTH_VERIFICATION_EMAIL_ACCEPTED' }, { status: 202 });
  } catch (error) {
    console.error('[auth-register]', { name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ code: 'AUTH_REGISTER_FAILED' }, { status: 503 });
  }
}
