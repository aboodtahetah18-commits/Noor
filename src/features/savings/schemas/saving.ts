import { Money } from '@/financial-engine/money';

export interface TransferSavingInput {
  savingAllocationId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  transactionDate: string;
  description?: string;
  idempotencyKey: string;
}

export type SavingTransferValidation =
  | { success: true; data: TransferSavingInput }
  | { success: false; message: string };

const uuidLike = /^[0-9a-f-]{32,36}$/i;
const amountLike = /^\d{1,16}(?:\.\d{1,2})?$/;
const dateLike = /^\d{4}-\d{2}-\d{2}$/;

export function validateSavingTransfer(input: Partial<TransferSavingInput>): SavingTransferValidation {
  if (!input.savingAllocationId || !uuidLike.test(input.savingAllocationId)) return { success:false, message:'تخصيص الادخار غير صالح.' };
  if (!input.fromAccountId || !uuidLike.test(input.fromAccountId)) return { success:false, message:'الحساب المصدر غير صالح.' };
  if (!input.toAccountId || !uuidLike.test(input.toAccountId)) return { success:false, message:'حساب الادخار غير صالح.' };
  if (input.fromAccountId === input.toAccountId) return { success:false, message:'الحساب المصدر وحساب الادخار يجب أن يكونا مختلفين.' };
  if (!input.amount || !amountLike.test(input.amount)) return { success:false, message:'مبلغ الادخار غير صالح.' };
  try { if (!Money.parse(input.amount).isPositive()) return { success:false, message:'مبلغ الادخار يجب أن يكون أكبر من صفر.' }; }
  catch { return { success:false, message:'مبلغ الادخار غير صالح.' }; }
  if (!input.transactionDate || !dateLike.test(input.transactionDate)) return { success:false, message:'تاريخ التحويل مطلوب.' };
  if (input.description && input.description.trim().length > 1000) return { success:false, message:'وصف التحويل طويل جدًا.' };
  if (!input.idempotencyKey?.trim() || input.idempotencyKey.trim().length > 200) return { success:false, message:'مفتاح منع التكرار غير صالح.' };
  return { success:true, data:{
    savingAllocationId:input.savingAllocationId,
    fromAccountId:input.fromAccountId,
    toAccountId:input.toAccountId,
    amount:Money.parse(input.amount).toString(),
    transactionDate:input.transactionDate,
    description:input.description?.trim() || undefined,
    idempotencyKey:input.idempotencyKey.trim(),
  }};
}
