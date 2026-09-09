'use server';
import { randomUUID } from 'node:crypto';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { recordExpense } from '@/features/expenses/commands/record-expense';
import { EXPENSE_NATURES, PLANNING_STATUSES, type ExpenseNature, type PlanningStatus } from '@/domain/types';

function planningStatus(value: string): PlanningStatus | undefined { return PLANNING_STATUSES.find((item) => item === value); }
function expenseNature(value: string): ExpenseNature | undefined { return EXPENSE_NATURES.find((item) => item === value); }

export async function recordExpenseAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  await recordExpense(user.id, {
    cycleId: String(formData.get('cycleId') ?? ''),
    accountId: String(formData.get('accountId') ?? ''),
    categoryId: String(formData.get('categoryId') ?? ''),
    amount: String(formData.get('amount') ?? ''),
    transactionDate: String(formData.get('transactionDate') ?? ''),
    planningStatus: planningStatus(String(formData.get('planningStatus') ?? '')),
    expenseNature: expenseNature(String(formData.get('expenseNature') ?? '')),
    description: String(formData.get('description') ?? ''),
    idempotencyKey: String(formData.get('idempotencyKey') || randomUUID()),
  });
}
