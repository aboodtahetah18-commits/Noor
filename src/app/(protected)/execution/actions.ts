'use server';

import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { reportUserExecution } from '@/features/financial-engine/services/execution-service';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';

export async function reportExecutionAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('execution-report');
  const executionTaskId=String(formData.get('executionTaskId')??'');
  const externalReference=String(formData.get('externalReference')??'').trim();
  const evidenceType=String(formData.get('evidenceType')??'REFERENCE') as 'BANK_RECEIPT'|'TRANSFER_RECEIPT'|'BILL_RECEIPT'|'STATEMENT'|'REFERENCE'|'OTHER';
  const reportedAmount=String(formData.get('reportedAmount')??'').trim()||null;
  const claimedDate=String(formData.get('claimedDate')??'').trim()||null;
  const sourceAccountRef=String(formData.get('sourceAccountRef')??'').trim()||null;
  const counterpartyRef=String(formData.get('counterpartyRef')??'').trim()||null;
  if(!executionTaskId)redirect('/execution?error=EXECUTION_TASK_REQUIRED');
  if(!externalReference)redirect('/execution?error=EVIDENCE_REFERENCE_REQUIRED');
  try{
    await reportUserExecution({
      userId:user.id,
      executionTaskId,
      reportedAmount,
      externalReference,
      executedAt:new Date().toISOString(),
      evidence:{
        type:evidenceType,
        fileOrReference:externalReference,
        claimedAmount:reportedAmount,
        claimedDate:claimedDate?`${claimedDate}T00:00:00.000Z`:null,
        sourceAccountRef,
        counterpartyRef,
      },
    });
    redirect('/execution?reported=1');
  }catch(error){
    if(error instanceof FinancialPlatformError)redirect(`/execution?error=${encodeURIComponent(error.code)}`);
    throw error;
  }
}
