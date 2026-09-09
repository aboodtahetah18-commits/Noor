import { incomeRepository } from '@/repositories/income-repository';

export async function getIncomeReceipt(userId: string, transactionId: string) {
  const transaction = await incomeRepository.getById(userId, transactionId);
  if (!transaction) return null;

  const [variance, accountBalance] = await Promise.all([
    incomeRepository.getVariance(userId, transaction.cycleId, transaction.expectedIncomeId ?? undefined),
    incomeRepository.getAccountBalance(userId, transaction.accountId),
  ]);

  return { transaction, variance, accountBalance };
}
