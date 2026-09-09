import { INCOME_KINDS, type IncomeKind } from '@/domain/types';
import { Money } from '@/financial-engine/money';

export interface RecordIncomeInput {
  cycleId: string;
  accountId: string;
  amount: string;
  transactionDate: string;
  sourceName: string;
  incomeKind: IncomeKind;
  expectedIncomeId?: string;
  isPartial?: boolean;
  description?: string;
  idempotencyKey: string;
}

export type IncomeValidation =
  | { success: true; data: RecordIncomeInput }
  | { success: false; message: string };

const uuidLike = /^[0-9a-f-]{32,36}$/i;
const amountLike = /^\d{1,16}(?:\.\d{1,2})?$/;
const dateLike = /^\d{4}-\d{2}-\d{2}$/;

export function validateRecordIncome(input: Partial<RecordIncomeInput>): IncomeValidation {
  if (!input.cycleId || !uuidLike.test(input.cycleId)) return { success: false, message: 'الدورة المالية غير صالحة.' };
  if (!input.accountId || !uuidLike.test(input.accountId)) return { success: false, message: 'الحساب غير صالح.' };
  if (!input.amount || !amountLike.test(input.amount)) return { success: false, message: 'مبلغ الدخل يجب أن يكون أكبر من صفر وبحد أقصى منزلتين عشريتين.' };
  try { if (!Money.parse(input.amount).isPositive()) return { success: false, message: 'مبلغ الدخل يجب أن يكون أكبر من صفر وبحد أقصى منزلتين عشريتين.' }; } catch { return { success: false, message: 'مبلغ الدخل غير صالح.' }; }
  if (!input.transactionDate || !dateLike.test(input.transactionDate)) return { success: false, message: 'تاريخ الدخل مطلوب.' };
  if (!input.sourceName?.trim() || input.sourceName.trim().length > 120) return { success: false, message: 'مصدر الدخل غير صالح.' };
  if (!input.incomeKind || !INCOME_KINDS.includes(input.incomeKind)) return { success: false, message: 'نوع الدخل غير صالح.' };
  if (input.expectedIncomeId && !uuidLike.test(input.expectedIncomeId)) return { success: false, message: 'مرجع الدخل المتوقع غير صالح.' };
  if (input.description && input.description.trim().length > 1000) return { success: false, message: 'وصف الدخل طويل جدًا.' };
  if (!input.idempotencyKey?.trim() || input.idempotencyKey.trim().length > 200) return { success: false, message: 'مفتاح منع التكرار غير صالح.' };
  return { success: true, data: { ...input, sourceName: input.sourceName.trim(), description: input.description?.trim() || undefined } as RecordIncomeInput };
}
