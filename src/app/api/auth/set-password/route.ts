export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { setInitialPassword } from '@/lib/auth/auth-lifecycle';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';

export async function POST(request: Request) {
  try { await assertTrustedMutationOrigin(); } catch { return NextResponse.json({ code: 'AUTH_ORIGIN_REJECTED' }, { status: 403 }); }
  try { enforceRateLimit('auth-set-password', 8, 60_000); } catch { return NextResponse.json({ code: 'AUTH_RATE_LIMITED' }, { status: 429 }); }
  let body: { token?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'AUTH_INPUT_INVALID' }, { status: 400 }); }
  try {
    const result = await setInitialPassword({ token: String(body.token ?? ''), password: String(body.password ?? '') });
    if (!result.ok) return NextResponse.json({ code: result.code }, { status: 422 });
    return NextResponse.json({ ok: true, code: 'AUTH_PASSWORD_SET' });
  } catch (error) {
    console.error('[auth-set-password]', { name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ code: 'AUTH_PASSWORD_SET_FAILED' }, { status: 503 });
  }
}
