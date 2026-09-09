import { EXPENSE_NATURES, PLANNING_STATUSES, type ExpenseNature, type PlanningStatus } from '@/domain/types';
import { Money } from '@/financial-engine/money';

export interface RecordExpenseInput {
  cycleId: string;
  accountId: string;
  categoryId: string;
  amount: string;
  transactionDate: string;
  planningStatus: PlanningStatus;
  expenseNature: ExpenseNature;
  description?: string;
  idempotencyKey: string;
}

export type ExpenseValidation =
  | { success: true; data: RecordExpenseInput }
  | { success: false; message: string };

const uuidLike = /^[0-9a-f-]{32,36}$/i;
const amountLike = /^\d{1,16}(?:\.\d{1,2})?$/;
const dateLike = /^\d{4}-\d{2}-\d{2}$/;

export function validateRecordExpense(input: Partial<RecordExpenseInput>): ExpenseValidation {
  if (!input.cycleId || !uuidLike.test(input.cycleId)) return { success: false, message: 'الدورة المالية غير صالحة.' };
  if (!input.accountId || !uuidLike.test(input.accountId)) return { success: false, message: 'الحساب غير صالح.' };
  if (!input.categoryId || !uuidLike.test(input.categoryId)) return { success: false, message: 'بند الميزانية غير صالح.' };
  if (!input.amount || !amountLike.test(input.amount)) return { success: false, message: 'مبلغ المصروف غير صالح.' };
  try {
    if (!Money.parse(input.amount).isPositive()) return { success: false, message: 'مبلغ المصروف يجب أن يكون أكبر من صفر.' };
  } catch {
    return { success: false, message: 'مبلغ المصروف غير صالح.' };
  }
  if (!input.transactionDate || !dateLike.test(input.transactionDate)) return { success: false, message: 'تاريخ المصروف مطلوب.' };
  if (!input.planningStatus || !PLANNING_STATUSES.includes(input.planningStatus)) return { success: false, message: 'حالة التخطيط غير صالحة.' };
  if (!input.expenseNature || !EXPENSE_NATURES.includes(input.expenseNature)) return { success: false, message: 'طبيعة المصروف غير صالحة.' };
  if (input.description && input.description.trim().length > 1000) return { success: false, message: 'وصف المصروف طويل جدًا.' };
  if (!input.idempotencyKey?.trim() || input.idempotencyKey.trim().length > 200) return { success: false, message: 'مفتاح منع التكرار غير صالح.' };
  return {
    success: true,
    data: {
      ...input,
      description: input.description?.trim() || undefined,
      idempotencyKey: input.idempotencyKey.trim(),
    } as RecordExpenseInput,
  };
}
