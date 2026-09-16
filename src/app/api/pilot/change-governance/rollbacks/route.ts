import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';
import { logServerError } from '@/security/safe-logging';
import { rawSql } from '@/infrastructure/db/client';
import { buildGovernedRollback } from '@/financial-engine/learning/governed-learning-governance';
import { executeGovernedAlgorithmRollback } from '@/features/governance/services/execute-governed-algorithm-rollback';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
const schema = z.object({
  releaseId: z.string().uuid(),
  reason: z.string().trim().min(20).max(8000),
});

function statusFor(error: unknown): number {
  const message=error instanceof Error?error.message:'';
  if(message.startsWith('AUTHORIZATION_DENIED:'))return 403;
  if(message.includes('REQUIRES_APPROVED_REVIEW')||message.includes('GOVERNANCE_GATE_FAILED'))return 409;
  return 500;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401, headers });
  try {
    await assertTrustedMutationOrigin();
    enforceRateLimit(`pilot-governance-rollback:${user.id}`);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, error: 'INVALID_REQUEST' }, { status: 422, headers });

    const rows=await rawSql`
      select r.version, r.previous_version
      from public.algorithm_releases r
      where r.id=${parsed.data.releaseId}::uuid
        and r.user_id=${user.id}::uuid
      limit 1
    `;
    const row=rows[0];
    if(!row)return NextResponse.json({ok:false,error:'ALGORITHM_RELEASE_NOT_FOUND'},{status:404,headers});

    const event=buildGovernedRollback({
      releaseId:parsed.data.releaseId,
      fromVersion:String(row.version),
      previousVersion:String(row.previous_version),
      reason:parsed.data.reason,
    });
    const rollbackId=await executeGovernedAlgorithmRollback({actorUserId:user.id,event});
    return NextResponse.json({ok:true,rollbackId,fromVersion:event.fromVersion,toVersion:event.toVersion},{status:201,headers});
  } catch (error) {
    const status=statusFor(error);
    const requestId = logServerError('pilot-governance-rollback-failed', {
      endpoint: '/api/pilot/change-governance/rollbacks',
      userId: user.id,
    });
    return NextResponse.json({ ok: false, error: status===403?'FORBIDDEN':'ALGORITHM_GOVERNANCE_WRITE_FAILED', requestId }, { status, headers });
  }
}
