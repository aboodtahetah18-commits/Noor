export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { authHealth, createOwner, normalizeAuthEmail } from '@/lib/auth/http-auth';
import { AUTH_SESSION_COOKIE, authCookieOptions } from '@/lib/auth/session-cookie';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';

export async function POST(request: Request) {
  try { await assertTrustedMutationOrigin(); } catch { return NextResponse.json({ code: 'AUTH_ORIGIN_REJECTED' }, { status: 403 }); }
  try { enforceRateLimit('auth-owner-register', 6, 60_000); } catch { return NextResponse.json({ code: 'AUTH_RATE_LIMITED' }, { status: 429 }); }
  const health = await authHealth();
  if (!health.ok) return NextResponse.json({ code: health.code, detail: health.detail }, { status: 503 });

  let body: { name?: unknown; email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'AUTH_INPUT_INVALID' }, { status: 400 }); }
  const name = String(body.name ?? '').trim();
  const email = normalizeAuthEmail(String(body.email ?? ''));
  const password = String(body.password ?? '');
  if (name.length < 2 || !email.includes('@') || password.length < 12) {
    return NextResponse.json({ code: 'AUTH_INPUT_INVALID' }, { status: 400 });
  }

  const created = await createOwner({ name, email, password });
  if (!created.ok) {
    return NextResponse.json({ code: created.code }, { status: created.code === 'AUTH_OWNER_EXISTS' ? 409 : 500 });
  }

  const response = NextResponse.json({ ok: true, code: 'AUTH_OWNER_CREATED' });
  response.cookies.set(AUTH_SESSION_COOKIE, created.token, authCookieOptions(created.expiresAt));
  return response;
}
