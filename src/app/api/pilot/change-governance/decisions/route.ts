import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';
import { logServerError } from '@/security/safe-logging';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';
import { recordAlgorithmChangeDecision } from '@/features/pilot/services/algorithm-governance-write-service';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
const schema=z.object({
  proposalId:z.string().uuid(),
  backtestRunId:z.string().uuid().optional().nullable(),
  decision:z.enum(['APPROVED','REJECTED','CHANGES_REQUESTED']),
  rationale:z.string().trim().min(20).max(8000),
}).superRefine((value,ctx)=>{
  if(value.decision==='APPROVED'&&!value.backtestRunId){
    ctx.addIssue({code:z.ZodIssueCode.custom,path:['backtestRunId'],message:'APPROVED requires a backtestRunId'});
  }
});

export async function POST(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  try{
    await assertTrustedMutationOrigin();
    enforceRateLimit(`pilot-governance-decision:${user.id}`);
    const parsed=schema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({ok:false,error:'INVALID_REQUEST'},{status:422,headers});
    const result=await recordAlgorithmChangeDecision({userId:user.id,...parsed.data});
    return NextResponse.json({ok:true,...result},{status:201,headers});
  }catch(error){
    if(error instanceof FinancialPlatformError)return NextResponse.json({ok:false,error:error.code},{status:error.httpStatus,headers});
    const requestId=logServerError('pilot-governance-decision-failed',{endpoint:'/api/pilot/change-governance/decisions',userId:user.id});
    return NextResponse.json({ok:false,error:'ALGORITHM_GOVERNANCE_WRITE_FAILED',requestId},{status:500,headers});
  }
}
