import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getCurrentFinancialState } from '@/features/financial-engine/queries/get-current-financial-state';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';
import { logServerError } from '@/security/safe-logging';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const querySchema = z.object({ cycleId: z.string().uuid() });
const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401, headers });

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ cycleId: url.searchParams.get('cycleId') });
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'INVALID_REQUEST' }, { status: 422, headers });

  try {
    const state = await getCurrentFinancialState(user.id, parsed.data.cycleId);
    return NextResponse.json({ ok: true, state }, { status: 200, headers });
  } catch (error) {
    if (error instanceof FinancialPlatformError) {
      return NextResponse.json({ ok: false, error: error.code }, { status: error.httpStatus, headers });
    }
    const requestId = logServerError('financial-engine-current-api-failed', { endpoint: '/api/financial-engine/current', userId: user.id });
    return NextResponse.json({ ok: false, error: 'FINANCIAL_STATE_UNAVAILABLE', requestId }, { status: 500, headers });
  }
}
