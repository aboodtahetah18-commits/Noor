import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';
import { logServerError } from '@/security/safe-logging';
import { recordUserDecision } from '@/features/financial-engine/services/decision-service';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
const bodySchema=z.object({
  decisionRequestId:z.string().uuid(),
  action:z.enum(['APPROVE','REJECT','DEFER','MODIFY']),
  note:z.string().trim().max(2000).optional().nullable(),
});

export async function POST(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  try{
    await assertTrustedMutationOrigin();
    enforceRateLimit(`decision-response:${user.id}`);
    const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({ok:false,error:'INVALID_REQUEST'},{status:422,headers});
    const result=await recordUserDecision({userId:user.id,...parsed.data});
    return NextResponse.json({ok:true,...result},{status:200,headers});
  }catch(error){
    if(error instanceof FinancialPlatformError)return NextResponse.json({ok:false,error:error.code},{status:error.httpStatus,headers});
    const requestId=logServerError('decision-response-api-failed',{endpoint:'/api/decisions/respond',userId:user.id});
    return NextResponse.json({ok:false,error:'DECISION_RESPONSE_FAILED',requestId},{status:500,headers});
  }
}
