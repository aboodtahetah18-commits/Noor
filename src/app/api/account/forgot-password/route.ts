export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  accountAccessBaseUrl,
  beginNamaaPasswordReset,
  sendNamaaAccountEmail,
} from '@/lib/auth/namaa-account-access';

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  if (!process.env.RESEND_API_KEY?.trim() || !process.env.AUTH_EMAIL_FROM?.trim()) {
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
