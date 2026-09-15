import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import {
  FinancialEnginePipelineError,
  runFullCyclePipelineForUser,
} from '@/features/financial-engine/services/run-full-cycle-pipeline';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';
import { logServerError } from '@/security/safe-logging';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestSchema = z.object({
  cycleId: z.string().uuid(),
});

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401, headers: noStoreHeaders });
  }

  try {
    await assertTrustedMutationOrigin();
    enforceRateLimit(`financial-engine-run:${user.id}`);

    const json = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_REQUEST', fields: { cycleId: 'INVALID_OR_REQUIRED' } },
        { status: 422, headers: noStoreHeaders },
      );
    }

    const pipeline = await runFullCyclePipelineForUser(user.id, parsed.data.cycleId);

    return NextResponse.json(
      { ok: true, pipeline },
      { status: 200, headers: noStoreHeaders },
    );
  } catch (error) {
    if (error instanceof FinancialEnginePipelineError) {
      return NextResponse.json(
        { ok: false, error: error.code },
        { status: error.httpStatus, headers: noStoreHeaders },
      );
    }

    const requestId = logServerError('financial-engine-pipeline-api-failed', {
      endpoint: '/api/financial-engine/run',
      userId: user.id,
    });

    return NextResponse.json(
      { ok: false, error: 'FINANCIAL_ENGINE_UNAVAILABLE', requestId },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
