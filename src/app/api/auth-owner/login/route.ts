export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { normalizeAuthEmail, signInWithPassword } from '@/lib/auth/http-auth';
import { AUTH_SESSION_COOKIE, authCookieOptions } from '@/lib/auth/session-cookie';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';

export async function POST(request: Request) {
  try { await assertTrustedMutationOrigin(); } catch { return NextResponse.json({ code: 'AUTH_ORIGIN_REJECTED' }, { status: 403 }); }
  try { enforceRateLimit('auth-owner-login', 10, 60_000); } catch { return NextResponse.json({ code: 'AUTH_RATE_LIMITED' }, { status: 429 }); }
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'AUTH_INPUT_INVALID' }, { status: 400 }); }
  const email = normalizeAuthEmail(String(body.email ?? ''));
  const password = String(body.password ?? '');
  if (!email || !password) return NextResponse.json({ code: 'AUTH_INPUT_INVALID' }, { status: 400 });

  try {
    const result = await signInWithPassword({ email, password });
    if (!result.ok) return NextResponse.json({ code: result.code }, { status: 401 });
    const response = NextResponse.json({ ok: true, code: 'AUTH_LOGIN_OK' });
    response.cookies.set(AUTH_SESSION_COOKIE, result.token, authCookieOptions(result.expiresAt));
    return response;
  } catch (error) {
    console.error('[auth-http-login]', { name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ code: 'AUTH_HTTP_DB_FAILED' }, { status: 503 });
  }
}
