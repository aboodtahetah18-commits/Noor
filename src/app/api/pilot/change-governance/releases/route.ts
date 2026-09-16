import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';
import { logServerError } from '@/security/safe-logging';
import { rawSql } from '@/infrastructure/db/client';
import { releaseGovernedAlgorithmChangeFromCase } from '@/features/governance/services/release-governed-algorithm-change-from-case';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
const schema = z.object({
  proposalId: z.string().uuid(),
  approvalDecisionId: z.string().uuid(),
  artifactText: z.string().trim().max(12000).optional(),
});

function statusFor(error: unknown): number {
  const message=error instanceof Error?error.message:'';
  if(message.startsWith('AUTHORIZATION_DENIED:'))return 403;
  if(message.includes('NOT_READY')||message.includes('MISMATCH')||message.includes('GATE'))return 409;
  return 500;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401, headers });
  try {
    await assertTrustedMutationOrigin();
    enforceRateLimit(`pilot-governance-release:${user.id}`);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, error: 'INVALID_REQUEST' }, { status: 422, headers });

    const rows=await rawSql`
      select lr.case_id::text as case_id
      from public.algorithm_learning_reviews lr
      join public.algorithm_change_proposals p on p.id=lr.proposal_id and p.user_id=lr.user_id
      join public.algorithm_change_decisions d on d.proposal_id=p.id and d.user_id=p.user_id
      where lr.user_id=${user.id}::uuid
        and p.id=${parsed.data.proposalId}::uuid
        and d.id=${parsed.data.approvalDecisionId}::uuid
        and d.decision='APPROVED'
      order by lr.created_at desc
      limit 1
    `;
    const caseId=rows[0]?.case_id?String(rows[0].case_id):null;
    if(!caseId)return NextResponse.json({ok:false,error:'RELEASE_SOURCE_NOT_FOUND'},{status:404,headers});

    const releaseId=await releaseGovernedAlgorithmChangeFromCase({actorUserId:user.id,ownerUserId:user.id,caseId});
    return NextResponse.json({ok:true,releaseId},{status:201,headers});
  } catch (error) {
    const status=statusFor(error);
    const requestId = logServerError('pilot-governance-release-failed', {
      endpoint: '/api/pilot/change-governance/releases',
      userId: user.id,
    });
    return NextResponse.json({ ok: false, error: status===403?'FORBIDDEN':'ALGORITHM_GOVERNANCE_WRITE_FAILED', requestId }, { status, headers });
  }
}
