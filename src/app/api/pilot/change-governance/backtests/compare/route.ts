import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';
import { logServerError } from '@/security/safe-logging';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';
import { runComparativeBacktest } from '@/features/pilot/services/algorithm-comparative-backtest-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };

const weightsSchema = z.object({
  essentials: z.number().min(0).max(100),
  cashLiquidity: z.number().min(0).max(100),
  reserveEmergency: z.number().min(0).max(100),
  debt: z.number().min(0).max(100),
  incomeShock: z.number().min(0).max(100),
  spendingFlexibility: z.number().min(0).max(100),
  assetLiquidity: z.number().min(0).max(100),
  executionDiscipline: z.number().min(0).max(100),
  goals: z.number().min(0).max(100),
  investmentConcentration: z.number().min(0).max(100),
});
const thresholdsSchema = z.object({
  vulnerableMin: z.number().gt(0).lte(100),
  balancedMin: z.number().gt(0).lte(100),
  stableMin: z.number().gt(0).lte(100),
  strongMin: z.number().gt(0).lte(100),
});
const schema = z.object({
  proposalId: z.string().uuid(),
  datasetStartsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  datasetEndsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  candidateWeights: weightsSchema.optional(),
  candidateThresholds: thresholdsSchema.optional(),
  acceptance: z.object({
    minSampleCount: z.number().int().min(1).max(1000),
    maxStateDowngradeRatePct: z.number().min(0).max(100),
    maxMeanAbsoluteScoreDelta: z.number().min(0).max(100),
  }),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401, headers });

  try {
    await assertTrustedMutationOrigin();
    enforceRateLimit(`pilot-governance-comparative-backtest:${user.id}`);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, error: 'INVALID_REQUEST' }, { status: 422, headers });
    if (parsed.data.datasetEndsAt < parsed.data.datasetStartsAt) {
      return NextResponse.json({ ok: false, error: 'INVALID_DATASET_RANGE' }, { status: 422, headers });
    }

    const result = await runComparativeBacktest({ userId: user.id, ...parsed.data });
    return NextResponse.json({ ok: true, ...result }, { status: 201, headers });
  } catch (error) {
    if (error instanceof FinancialPlatformError) {
      return NextResponse.json({ ok: false, error: error.code }, { status: error.httpStatus, headers });
    }
    const requestId = logServerError('pilot-comparative-backtest-failed', {
      endpoint: '/api/pilot/change-governance/backtests/compare',
      userId: user.id,
    });
    return NextResponse.json({ ok: false, error: 'COMPARATIVE_BACKTEST_FAILED', requestId }, { status: 500, headers });
  }
}
