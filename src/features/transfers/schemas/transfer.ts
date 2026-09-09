import { Money } from '@/financial-engine/money';

export interface TransferBetweenAccountsInput {
  cycleId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  transactionDate: string;
  description?: string;
  idempotencyKey: string;
}

export type TransferValidation =
  | { success: true; data: TransferBetweenAccountsInput }
  | { success: false; message: string };

const uuidLike = /^[0-9a-f-]{32,36}$/i;
const amountLike = /^\d{1,16}(?:\.\d{1,2})?$/;
const dateLike = /^\d{4}-\d{2}-\d{2}$/;

export function validateTransfer(input: Partial<TransferBetweenAccountsInput>): TransferValidation {
  if (!input.cycleId || !uuidLike.test(input.cycleId)) return { success:false, message:'الدورة المالية غير صالحة.' };
  if (!input.fromAccountId || !uuidLike.test(input.fromAccountId)) return { success:false, message:'الحساب المصدر غير صالح.' };
  if (!input.toAccountId || !uuidLike.test(input.toAccountId)) return { success:false, message:'الحساب الوجهة غير صالح.' };
  if (input.fromAccountId === input.toAccountId) return { success:false, message:'يجب أن يكون الحساب المصدر مختلفًا عن الحساب الوجهة.' };
  if (!input.amount || !amountLike.test(input.amount)) return { success:false, message:'مبلغ التحويل غير صالح.' };
  try { if (!Money.parse(input.amount).isPositive()) return { success:false, message:'مبلغ التحويل يجب أن يكون أكبر من صفر.' }; }
  catch { return { success:false, message:'مبلغ التحويل غير صالح.' }; }
  if (!input.transactionDate || !dateLike.test(input.transactionDate)) return { success:false, message:'تاريخ التحويل مطلوب.' };
  if (input.description && input.description.trim().length > 1000) return { success:false, message:'وصف التحويل طويل جدًا.' };
  if (!input.idempotencyKey?.trim() || input.idempotencyKey.trim().length > 200) return { success:false, message:'مفتاح منع التكرار غير صالح.' };
  return { success:true, data:{
    cycleId:input.cycleId, fromAccountId:input.fromAccountId, toAccountId:input.toAccountId,
    amount:input.amount, transactionDate:input.transactionDate, description:input.description?.trim() || undefined,
    idempotencyKey:input.idempotencyKey.trim(),
  }};
}
