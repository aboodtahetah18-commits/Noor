import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';
import { logServerError } from '@/security/safe-logging';
import { recordGovernedAlgorithmDecision } from '@/features/governance/services/record-governed-algorithm-decision';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
const schema=z.object({
  proposalId:z.string().uuid(),
  backtestRunId:z.string().uuid(),
  decision:z.enum(['APPROVED','REJECTED']),
  rationale:z.string().trim().min(20).max(8000),
});

function statusFor(error: unknown): number {
  const message=error instanceof Error?error.message:'';
  if(message.startsWith('AUTHORIZATION_DENIED:'))return 403;
  if(message.includes('NOT_FOUND'))return 404;
  if(message.includes('REQUIRES_')||message.includes('MISMATCH'))return 409;
  return 500;
}

export async function POST(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  try{
    await assertTrustedMutationOrigin();
    enforceRateLimit(`pilot-governance-decision:${user.id}`);
    const parsed=schema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({ok:false,error:'INVALID_REQUEST'},{status:422,headers});
    const decisionId=await recordGovernedAlgorithmDecision({actorUserId:user.id,...parsed.data});
    return NextResponse.json({ok:true,decisionId},{status:201,headers});
  }catch(error){
    const status=statusFor(error);
    const requestId=logServerError('pilot-governance-decision-failed',{endpoint:'/api/pilot/change-governance/decisions',userId:user.id});
    return NextResponse.json({ok:false,error:status===403?'FORBIDDEN':'ALGORITHM_GOVERNANCE_WRITE_FAILED',requestId},{status,headers});
  }
}
