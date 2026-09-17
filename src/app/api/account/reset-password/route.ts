export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { resetNamaaPassword } from '@/lib/auth/namaa-account-access';
import { guardPublicAccountRequest, publicAccountGuardError } from '@/security/public-account-mutation';

export async function POST(request: Request) {
  try {
    await guardPublicAccountRequest(request, 'reset-password', { limit: 10 });
  } catch (error) {
    const guarded = publicAccountGuardError(error);
    if (guarded) return NextResponse.json({ code: guarded.code }, { status: guarded.status });
    return NextResponse.json({ code: 'AUTH_PASSWORD_FAILED' }, { status: 503 });
  }

  let body: { token?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'AUTH_INPUT_INVALID' }, { status: 400 });
  }

  try {
    const result = await resetNamaaPassword(String(body.token ?? ''), String(body.password ?? ''));
    if (!result.ok) return NextResponse.json({ code: result.code }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[namaa-account-reset-password]', { name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ code: 'AUTH_PASSWORD_FAILED' }, { status: 503 });
  }
}
