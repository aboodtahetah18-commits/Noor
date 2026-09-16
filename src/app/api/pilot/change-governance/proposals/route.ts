import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';
import { logServerError } from '@/security/safe-logging';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';
import { createAlgorithmChangeProposal } from '@/features/pilot/services/algorithm-governance-write-service';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
const schema=z.object({
  reviewItemId:z.string().trim().min(1).max(200),
  candidateVersion:z.string().trim().min(1).max(120),
  specText:z.string().trim().min(20).max(12000),
  acceptanceCriteriaText:z.string().trim().min(20).max(12000),
  rollbackPlanText:z.string().trim().min(20).max(12000),
});

export async function POST(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  try{
    await assertTrustedMutationOrigin();
    enforceRateLimit(`pilot-governance-proposal:${user.id}`);
    const parsed=schema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({ok:false,error:'INVALID_REQUEST'},{status:422,headers});
    const result=await createAlgorithmChangeProposal({userId:user.id,...parsed.data});
    return NextResponse.json({ok:true,...result},{status:201,headers});
  }catch(error){
    if(error instanceof FinancialPlatformError)return NextResponse.json({ok:false,error:error.code},{status:error.httpStatus,headers});
    const requestId=logServerError('pilot-governance-proposal-failed',{endpoint:'/api/pilot/change-governance/proposals',userId:user.id});
    return NextResponse.json({ok:false,error:'ALGORITHM_GOVERNANCE_WRITE_FAILED',requestId},{status:500,headers});
  }
}
