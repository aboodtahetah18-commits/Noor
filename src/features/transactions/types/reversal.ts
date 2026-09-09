import type { TransactionType } from '@/domain/types';

export type ReversibleTransactionType = 'INCOME' | 'EXPENSE';

export interface TransactionReversalFinancialImpact {
  accountId: string | null;
  accountBalanceAfter: string | null;
  categoryId: string | null;
  categoryPlanned: string | null;
  categoryActualAfter: string | null;
  categoryRemainingAfter: string | null;
  categoryUtilizationPercent: string | null;
  categoryStatusAfter: 'NORMAL' | 'OVER_BUDGET' | null;
  safeToSpendStatus: 'BUFFER_POLICY_REQUIRED';
  safeToSpendBlockingIssue: 'BUFFER_POLICY_REQUIRED';
}

export interface TransactionReversalResult {
  transactionId: string;
  transactionType: TransactionType;
  status: 'REVERSED';
  reversedAt: string;
  reason: string;
  idempotencyKey: string;
  financialImpact: TransactionReversalFinancialImpact;
}
