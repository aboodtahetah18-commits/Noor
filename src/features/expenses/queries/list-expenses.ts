import { expenseRepository } from '@/repositories/expense-repository';
export async function listExpenses(userId: string, cycleId?: string) {
  return expenseRepository.list(userId, cycleId);
}
