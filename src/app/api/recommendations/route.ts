import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listCycleRecommendations } from '@/features/financial-engine/queries/list-cycle-recommendations';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';
import { logServerError } from '@/security/safe-logging';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const querySchema = z.object({
  cycleId: z.string().uuid(),
  includeClosed: z.enum(['0','1']).optional(),
});
const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401, headers });

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    cycleId: url.searchParams.get('cycleId'),
    includeClosed: url.searchParams.get('includeClosed') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'INVALID_REQUEST' }, { status: 422, headers });

  try {
    const recommendations = await listCycleRecommendations(user.id, parsed.data.cycleId, parsed.data.includeClosed === '1');
    return NextResponse.json({ ok: true, recommendations }, { status: 200, headers });
  } catch (error) {
    if (error instanceof FinancialPlatformError) {
      return NextResponse.json({ ok: false, error: error.code }, { status: error.httpStatus, headers });
    }
    const requestId = logServerError('recommendations-api-failed', { endpoint: '/api/recommendations', userId: user.id });
    return NextResponse.json({ ok: false, error: 'RECOMMENDATIONS_UNAVAILABLE', requestId }, { status: 500, headers });
  }
}
