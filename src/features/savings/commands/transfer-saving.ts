import { savingRepository } from '@/repositories/saving-repository';
import { validateSavingTransfer, type TransferSavingInput } from '@/features/savings/schemas/saving';
import type { SavingTransferResult } from '@/features/savings/types/saving';
export type TransferSavingCommandResult={success:true;data:SavingTransferResult}|{success:false;message:string};
export async function transferSaving(userId:string,input:TransferSavingInput):Promise<TransferSavingCommandResult>{
  const parsed=validateSavingTransfer(input); if(!parsed.success)return parsed;
  try{return {success:true,data:await savingRepository.transfer(userId,parsed.data)}}catch(error){
    const code=error instanceof Error?error.message:'';
    if(code==='SAVING_ALLOCATION_NOT_AVAILABLE') return {success:false,message:'لا يوجد تخصيص ادخار متاح للتحويل في الدورة النشطة.'};
    if(code==='SAVING_TRANSFER_EXCEEDS_REMAINING') return {success:false,message:'مبلغ التحويل يتجاوز المتبقي المخصص للادخار.'};
    if(code==='IDEMPOTENCY_KEY_REUSED') return {success:false,message:'تم استخدام مفتاح العملية لطلب مختلف.'};
    if(code==='SAVING_TRANSFER_PRECONDITION_FAILED') return {success:false,message:'تعذر تنفيذ تحويل الادخار. تحقق من الدورة والحسابات والتخصيص.'};
    throw error;
  }
}
