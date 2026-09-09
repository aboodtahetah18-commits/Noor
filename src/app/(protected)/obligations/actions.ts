'use server';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { createObligationTemplate } from '@/features/obligations/commands/create-obligation-template';
import { payObligation } from '@/features/obligations/commands/pay-obligation';
import { cancelObligation } from '@/features/obligations/commands/cancel-obligation';
import { OBLIGATION_RECURRENCES, type ObligationRecurrence } from '@/domain/types';

function parseRecurrence(value: string): ObligationRecurrence | undefined {
  return OBLIGATION_RECURRENCES.find((item) => item === value);
}

export async function createObligationAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const priorityRaw = String(formData.get('priority') ?? '').trim();
  const recurrence = parseRecurrence(String(formData.get('recurrence') ?? ''));
  if (!recurrence) return redirect('/obligations/new?error=' + encodeURIComponent('قيمة تكرار الالتزام غير صالحة'));
  const result = await createObligationTemplate(user.id, {
    name: String(formData.get('name') ?? ''),
    defaultAmount: String(formData.get('defaultAmount') ?? ''),
    recurrence,
    priority: priorityRaw ? Number(priorityRaw) : undefined,
    expectedAccountId: String(formData.get('expectedAccountId') ?? '') || undefined,
    firstDueDate: String(formData.get('firstDueDate') ?? ''),
    idempotencyKey: String(formData.get('idempotencyKey') || randomUUID()),
  });
  if (!result.success) return redirect(`/obligations/new?error=${encodeURIComponent(result.message)}`);
  return redirect('/obligations?created=1');
}

export async function payObligationAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const occurrenceId = String(formData.get('obligationOccurrenceId') ?? '');
  const result = await payObligation(user.id, {
    obligationOccurrenceId: occurrenceId,
    accountId: String(formData.get('accountId') ?? ''),
    amount: String(formData.get('amount') ?? ''),
    transactionDate: String(formData.get('transactionDate') ?? ''),
    idempotencyKey: String(formData.get('idempotencyKey') || randomUUID()),
  });
  if (!result.success) return redirect(`/obligations/${occurrenceId}/pay?error=${encodeURIComponent(result.message)}`);
  return redirect(`/obligations?paid=1&transactionId=${encodeURIComponent(result.data.transactionId)}`);
}

export async function cancelObligationAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const result = await cancelObligation(user.id, {
    obligationOccurrenceId: String(formData.get('obligationOccurrenceId') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if (!result.success) return redirect(`/obligations?error=${encodeURIComponent(result.message)}`);
  return redirect('/obligations?cancelled=1');
}
