export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  accountAccessBaseUrl,
  beginNamaaVerificationResend,
  isNamaaAccountEmailConfigured,
  sendNamaaAccountEmail,
} from '@/lib/auth/namaa-account-access';
import { guardPublicAccountRequest, publicAccountGuardError } from '@/security/public-account-mutation';

export async function POST(request: Request) {
  try {
    await guardPublicAccountRequest(request, 'resend-verification', { limit: 5 });
  } catch (error) {
    const guarded = publicAccountGuardError(error);
    if (guarded) return NextResponse.json({ code: guarded.code }, { status: guarded.status });
    return NextResponse.json({ code: 'AUTH_VERIFICATION_RESEND_FAILED' }, { status: 503 });
  }

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'AUTH_INPUT_INVALID' }, { status: 400 });
  }

  if (!isNamaaAccountEmailConfigured()) {
    return NextResponse.json({ code: 'AUTH_EMAIL_NOT_CONFIGURED' }, { status: 503 });
  }

  try {
    const result = await beginNamaaVerificationResend(String(body.email ?? ''));
    if (result.deliver) {
      const url = new URL(`/api/account/verify-email?token=${encodeURIComponent(result.token)}`, accountAccessBaseUrl()).toString();
      await sendNamaaAccountEmail({ to: result.email, kind: 'verify-email', url });
    }
    return NextResponse.json({ ok: true, code: 'AUTH_VERIFICATION_EMAIL_ACCEPTED' }, { status: 202 });
  } catch (error) {
    console.error('[namaa-account-resend-verification]', { name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ code: 'AUTH_VERIFICATION_RESEND_FAILED' }, { status: 503 });
  }
}
