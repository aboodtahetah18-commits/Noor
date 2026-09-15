import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';
import { logServerError } from '@/security/safe-logging';
import { createDecisionRequestFromRecommendation } from '@/features/financial-engine/services/decision-service';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
const bodySchema=z.object({
  recommendationId:z.string().uuid(),
  requestedAmount:z.string().regex(/^\d+(?:\.\d{1,2})?$/).optional().nullable(),
});

export async function POST(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  try{
    await assertTrustedMutationOrigin();
    enforceRateLimit(`decision-request:${user.id}`);
    const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({ok:false,error:'INVALID_REQUEST'},{status:422,headers});
    const result=await createDecisionRequestFromRecommendation({userId:user.id,...parsed.data});
    return NextResponse.json({ok:true,...result},{status:result.created?201:200,headers});
  }catch(error){
    if(error instanceof FinancialPlatformError)return NextResponse.json({ok:false,error:error.code},{status:error.httpStatus,headers});
    const requestId=logServerError('decision-request-api-failed',{endpoint:'/api/decisions/request',userId:user.id});
    return NextResponse.json({ok:false,error:'DECISION_REQUEST_FAILED',requestId},{status:500,headers});
  }
}
