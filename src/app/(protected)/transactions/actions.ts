'use server';

import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { reverseTransaction } from '@/features/transactions/commands/reverse-transaction';

export async function reverseTransactionAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const transactionId = String(formData.get('transactionId') ?? '');
  const reason = String(formData.get('reason') ?? '');
  const idempotencyKey = String(formData.get('idempotencyKey') ?? '');
  await reverseTransaction(user.id, { transactionId, reason, idempotencyKey });
  redirect(`/transactions/${transactionId}?reversed=1`);
}
