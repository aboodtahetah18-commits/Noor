import { incomeRepository } from '@/repositories/income-repository';
import { validateRecordIncome, type RecordIncomeInput } from '../schemas/income';
import type { RecordIncomeResult } from '../types/income';

export type RecordIncomeCommandResult = { success: true; data: RecordIncomeResult } | { success: false; message: string };

export async function recordIncome(userId: string, input: Partial<RecordIncomeInput>): Promise<RecordIncomeCommandResult> {
  const parsed = validateRecordIncome(input);
  if (!parsed.success) return parsed;
  try {
    const transaction = await incomeRepository.record(userId, parsed.data);
    const variance = await incomeRepository.getVariance(userId, parsed.data.cycleId, parsed.data.expectedIncomeId);
    const accountBalance = await incomeRepository.getAccountBalance(userId, parsed.data.accountId);
    return { success: true, data: { transaction, variance, accountBalance } };
  } catch (error) {
    if (error instanceof Error && error.message === 'INCOME_PRECONDITION_FAILED') return { success: false, message: 'يجب أن تكون الدورة نشطة والحساب صالحًا ومملوكًا لك.' };
    if (error instanceof Error && error.message === 'EXPECTED_INCOME_NOT_FOUND') return { success: false, message: 'الدخل المتوقع المرتبط غير موجود.' };
    throw error;
  }
}
