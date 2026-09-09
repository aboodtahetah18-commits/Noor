import { transactionRepository } from '@/repositories/transaction-repository';
import { transactionHistoryFiltersSchema } from '@/features/transactions/schemas/transaction-history';
import type { TransactionHistoryFiltersInput } from '@/features/transactions/schemas/transaction-history';

export async function listTransactions(userId: string, input: TransactionHistoryFiltersInput) {
  const filters = transactionHistoryFiltersSchema.parse(input);
  return transactionRepository.list(userId, filters);
}
