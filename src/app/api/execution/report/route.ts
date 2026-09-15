import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';
import { logServerError } from '@/security/safe-logging';
import { reportUserExecution } from '@/features/financial-engine/services/execution-service';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
const amount=z.string().regex(/^\d+(?:\.\d{1,2})?$/);
const evidenceSchema=z.object({
  type:z.enum(['BANK_RECEIPT','TRANSFER_RECEIPT','BILL_RECEIPT','STATEMENT','REFERENCE','OTHER']),
  fileOrReference:z.string().trim().max(2000).optional().nullable(),
  claimedAmount:amount.optional().nullable(),
  claimedDate:z.string().datetime().optional().nullable(),
  sourceAccountRef:z.string().trim().max(500).optional().nullable(),
  counterpartyRef:z.string().trim().max(500).optional().nullable(),
});
const bodySchema=z.object({
  executionTaskId:z.string().uuid(),
  reportedAmount:amount.optional().nullable(),
  externalReference:z.string().trim().max(500).optional().nullable(),
  executedAt:z.string().datetime().optional().nullable(),
  irreversible:z.boolean().optional(),
  evidence:evidenceSchema.optional().nullable(),
});

export async function POST(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  try{
    await assertTrustedMutationOrigin();
    enforceRateLimit(`execution-report:${user.id}`);
    const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({ok:false,error:'INVALID_REQUEST'},{status:422,headers});
    const result=await reportUserExecution({userId:user.id,...parsed.data});
    return NextResponse.json({ok:true,...result},{status:result.created?201:200,headers});
  }catch(error){
    if(error instanceof FinancialPlatformError)return NextResponse.json({ok:false,error:error.code},{status:error.httpStatus,headers});
    const requestId=logServerError('execution-report-api-failed',{endpoint:'/api/execution/report',userId:user.id});
    return NextResponse.json({ok:false,error:'EXECUTION_REPORT_FAILED',requestId},{status:500,headers});
  }
}
