import { expenseRepository } from '@/repositories/expense-repository';
import { validateRecordExpense, type RecordExpenseInput } from '../schemas/expense';
import type { RecordExpenseResult } from '../types/expense';

export type RecordExpenseCommandResult =
  | { success: true; data: RecordExpenseResult }
  | { success: false; code: string; message: string };

export async function recordExpense(userId: string, input: Partial<RecordExpenseInput>): Promise<RecordExpenseCommandResult> {
  const parsed = validateRecordExpense(input);
  if (!parsed.success) return { success: false, code: 'VALIDATION_ERROR', message: parsed.message };
  try {
    const transaction = await expenseRepository.record(userId, parsed.data);
    const budgetImpact = await expenseRepository.getBudgetImpact(userId, parsed.data.cycleId, parsed.data.categoryId);
    const financialImpact = await expenseRepository.getFinancialImpact(userId, parsed.data.cycleId, parsed.data.accountId);
    return { success: true, data: { transaction, budgetImpact, financialImpact } };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'EXPENSE_PRECONDITION_FAILED') return { success: false, code: 'EXPENSE_PRECONDITION_FAILED', message: 'يجب أن تكون الدورة والخطة نشطتين، والحساب والبند صالحين ومملوكين لك.' };
    if (message === 'CATEGORY_NOT_IN_ACTIVE_PLAN') return { success: false, code: 'CATEGORY_NOT_IN_ACTIVE_PLAN', message: 'البند غير موجود في النسخة المعتمدة من الخطة الحالية.' };
    if (message === 'CYCLE_NOT_ACTIVE') return { success: false, code: 'CYCLE_NOT_ACTIVE', message: 'الدورة المالية غير نشطة.' };
    throw error;
  }
}
