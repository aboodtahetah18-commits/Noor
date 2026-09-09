import { reverseTransactionSchema, type ReverseTransactionInput } from '../schemas/reversal';
import { reversePostedTransaction } from '@/repositories/transaction-repository';
import { transition } from '@/state-machines';

export async function reverseTransaction(userId: string, rawInput: ReverseTransactionInput) {
  const input = reverseTransactionSchema.parse(rawInput);

  transition({
    entityType: 'TRANSACTION',
    entityId: input.transactionId,
    currentState: 'POSTED',
    event: 'REVERSE_TRANSACTION',
    reason: input.reason,
    actorUserId: userId,
  });

  return reversePostedTransaction(userId, input);
}
