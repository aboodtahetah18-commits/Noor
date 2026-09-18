export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  accountAccessBaseUrl,
  beginNamaaRegistration,
  sendNamaaAccountEmail,
  isNamaaAccountEmailConfigured,
} from '@/lib/auth/namaa-account-access';
import { guardPublicAccountRequest, publicAccountGuardError } from '@/security/public-account-mutation';

export async function POST(request: Request) {
  try {
    await guardPublicAccountRequest(request, 'register', { limit: 5 });
  } catch (error) {
    const guarded = publicAccountGuardError(error);
    if (guarded) return NextResponse.json({ code: guarded.code }, { status: guarded.status });
    return NextResponse.json({ code: 'AUTH_REGISTER_FAILED' }, { status: 503 });
  }

  let body: { firstName?: unknown; lastName?: unknown; phone?: unknown; email?: unknown; city?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'AUTH_INPUT_INVALID' }, { status: 400 });
  }

  if (!isNamaaAccountEmailConfigured()) {
    return NextResponse.json({ code: 'AUTH_EMAIL_NOT_CONFIGURED' }, { status: 503 });
  }

  try {
    const result = await beginNamaaRegistration({
      firstName: String(body.firstName ?? ''),
      lastName: String(body.lastName ?? ''),
      phone: String(body.phone ?? ''),
      email: String(body.email ?? ''),
      city: String(body.city ?? ''),
      password: String(body.password ?? ''),
    });
    if (!result.ok) return NextResponse.json({ code: result.code }, { status: 400 });

    if (result.deliver) {
      const url = new URL(`/api/account/verify-email?token=${encodeURIComponent(result.token)}`, accountAccessBaseUrl()).toString();
      await sendNamaaAccountEmail({ to: result.email, kind: 'verify-email', url });
    }

    return NextResponse.json({ ok: true, code: 'AUTH_VERIFICATION_EMAIL_ACCEPTED' }, { status: 202 });
  } catch (error) {
    console.error('[namaa-account-register]', { name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ code: 'AUTH_REGISTER_FAILED' }, { status: 503 });
  }
}
