'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { recordIncome } from '@/features/income/commands/record-income';
import type { IncomeKind } from '@/domain/types';

export async function recordIncomeAction(cycleId: string, formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const result = await recordIncome(user.id, {
    cycleId,
    accountId: String(formData.get('accountId') ?? ''),
    amount: String(formData.get('amount') ?? ''),
    transactionDate: String(formData.get('transactionDate') ?? ''),
    sourceName: String(formData.get('sourceName') ?? ''),
    incomeKind: String(formData.get('incomeKind') ?? '') as IncomeKind,
    expectedIncomeId: String(formData.get('expectedIncomeId') ?? '') || undefined,
    isPartial: formData.get('isPartial') === 'on',
    description: String(formData.get('description') ?? '') || undefined,
    idempotencyKey: String(formData.get('idempotencyKey') ?? ''),
  });
  if (!result.success) { redirect(`/income/new?cycleId=${cycleId}&error=${encodeURIComponent(result.message)}`); return; }
  revalidatePath('/dashboard');
  revalidatePath('/accounts');
  revalidatePath(`/cycles/${cycleId}`);
  redirect(`/income/${result.data.transaction.id}`);
}
