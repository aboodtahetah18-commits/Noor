import { refundRepository } from '@/repositories/refund-repository';
import { validateRefund, type RecordRefundInput } from '../schemas/refund';
import type { RefundResult } from '../types/refund';
export type RefundCommandResult={success:true;data:RefundResult}|{success:false;code:string;message:string};
export async function recordRefund(userId:string,input:Partial<RecordRefundInput>):Promise<RefundCommandResult>{
  const parsed=validateRefund(input); if(!parsed.success) return {success:false,code:'VALIDATION_ERROR',message:parsed.message};
  try{return {success:true,data:await refundRepository.record(userId,parsed.data)}}catch(error){const m=error instanceof Error?error.message:'';
    if(m==='REFUND_PRECONDITION_FAILED') return {success:false,code:m,message:'يجب أن يكون المصروف الأصلي منشورًا والدورة نشطة والحساب المستلم صالحًا.'};
    if(m==='REFUND_EXCEEDS_ORIGINAL') return {success:false,code:m,message:'مجموع الاستردادات لا يمكن أن يتجاوز قيمة المصروف الأصلي.'};
    if(m==='IDEMPOTENCY_KEY_REUSED') return {success:false,code:m,message:'تم استخدام مفتاح العملية سابقًا لاسترداد مختلف.'};
    throw error;
  }
}
