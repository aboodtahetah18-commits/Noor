import { Money } from '@/financial-engine/money';

export interface RecordRefundInput {
  originalTransactionId: string;
  accountId: string;
  amount: string;
  transactionDate: string;
  description?: string;
  idempotencyKey: string;
}

export type RefundValidation = { success:true; data:RecordRefundInput } | { success:false; message:string };
const uuidLike=/^[0-9a-f-]{32,36}$/i, amountLike=/^\d{1,16}(?:\.\d{1,2})?$/, dateLike=/^\d{4}-\d{2}-\d{2}$/;
export function validateRefund(input:Partial<RecordRefundInput>):RefundValidation {
  if(!input.originalTransactionId || !uuidLike.test(input.originalTransactionId)) return {success:false,message:'المصروف الأصلي غير صالح.'};
  if(!input.accountId || !uuidLike.test(input.accountId)) return {success:false,message:'الحساب المستلم غير صالح.'};
  if(!input.amount || !amountLike.test(input.amount)) return {success:false,message:'مبلغ الاسترداد غير صالح.'};
  try { if(!Money.parse(input.amount).isPositive()) return {success:false,message:'مبلغ الاسترداد يجب أن يكون أكبر من صفر.'}; } catch { return {success:false,message:'مبلغ الاسترداد غير صالح.'}; }
  if(!input.transactionDate || !dateLike.test(input.transactionDate)) return {success:false,message:'تاريخ الاسترداد مطلوب.'};
  if(input.description && input.description.trim().length>1000) return {success:false,message:'وصف الاسترداد طويل جدًا.'};
  if(!input.idempotencyKey?.trim() || input.idempotencyKey.trim().length>200) return {success:false,message:'مفتاح منع التكرار غير صالح.'};
  return {success:true,data:{originalTransactionId:input.originalTransactionId,accountId:input.accountId,amount:input.amount,transactionDate:input.transactionDate,description:input.description?.trim()||undefined,idempotencyKey:input.idempotencyKey.trim()}};
}
