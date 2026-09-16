export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * Legacy bootstrap registration is intentionally disabled.
 * All new accounts must use /api/auth/register so email verification occurs
 * before a credential or session can exist.
 */
export async function POST() {
  return NextResponse.json({ code: 'AUTH_LEGACY_REGISTRATION_DISABLED' }, { status: 410 });
}
