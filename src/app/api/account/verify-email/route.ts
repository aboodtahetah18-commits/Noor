export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { accountAccessBaseUrl, verifyNamaaEmail } from '@/lib/auth/namaa-account-access';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  try {
    const result = await verifyNamaaEmail(token);
    if (!result.ok) {
      return NextResponse.redirect(new URL('/login?verification=invalid', accountAccessBaseUrl()));
    }
    return NextResponse.redirect(new URL('/login?verification=success', accountAccessBaseUrl()));
  } catch (error) {
    console.error('[namaa-account-verify-email]', { name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.redirect(new URL('/login?verification=failed', accountAccessBaseUrl()));
  }
}
