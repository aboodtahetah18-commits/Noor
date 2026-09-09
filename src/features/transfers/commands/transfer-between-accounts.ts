import { transferRepository } from '@/repositories/transfer-repository';
import { validateTransfer, type TransferBetweenAccountsInput } from '../schemas/transfer';
import type { TransferResult } from '../types/transfer';

export type TransferCommandResult = {success:true;data:TransferResult}|{success:false;code:string;message:string};
export async function transferBetweenAccounts(userId:string,input:Partial<TransferBetweenAccountsInput>):Promise<TransferCommandResult>{
  const parsed=validateTransfer(input); if(!parsed.success) return {success:false,code:'VALIDATION_ERROR',message:parsed.message};
  try { return {success:true,data:await transferRepository.transfer(userId,parsed.data)}; }
  catch(error){ const m=error instanceof Error?error.message:'';
    if(m==='TRANSFER_PRECONDITION_FAILED') return {success:false,code:m,message:'يجب أن تكون الدورة نشطة والحسابان نشطين ومملوكين لك.'};
    if(m==='IDEMPOTENCY_KEY_REUSED') return {success:false,code:m,message:'تم استخدام مفتاح العملية سابقًا لتحويل مختلف.'};
    throw error;
  }
}
