import { z } from 'zod';
import { transactionRepository } from '@/repositories/transaction-repository';

export async function getTransactionDetails(userId: string, transactionId: string) {
  const id = z.string().uuid().parse(transactionId);
  return transactionRepository.getById(userId, id);
}
