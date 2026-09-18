export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  accountAccessBaseUrl,
  beginNamaaPasswordReset,
  sendNamaaAccountEmail,
  isNamaaAccountEmailConfigured,
} from '@/lib/auth/namaa-account-access';
import { guardPublicAccountRequest, publicAccountGuardError } from '@/security/public-account-mutation';

export async function POST(request: Request) {
  try {
    await guardPublicAccountRequest(request, 'forgot-password', { limit: 5 });
  } catch (error) {
    const guarded = publicAccountGuardError(error);
    if (guarded?.code === 'AUTH_UNTRUSTED_ORIGIN') {
      return NextResponse.json({ code: guarded.code }, { status: guarded.status });
    }
    // Password recovery remains non-enumerating, including throttling responses.
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  if (!isNamaaAccountEmailConfigured()) {
    return NextResponse.json({ code: 'AUTH_EMAIL_NOT_CONFIGURED' }, { status: 503 });
  }

  try {
    const result = await beginNamaaPasswordReset(String(body.email ?? ''));
    if (result.deliver) {
      const url = new URL(`/reset-password?token=${encodeURIComponent(result.token)}`, accountAccessBaseUrl()).toString();
      await sendNamaaAccountEmail({ to: result.email, kind: 'reset-password', url });
    }
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error('[namaa-account-forgot-password]', { name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ ok: true }, { status: 202 });
  }
}
