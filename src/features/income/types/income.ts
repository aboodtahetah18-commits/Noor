import type { IncomeKind } from '@/domain/types';

export type IncomeVarianceStatus = 'MATCHED' | 'BELOW_EXPECTED' | 'ABOVE_EXPECTED' | 'UNLINKED';

export interface IncomeTransactionView {
  id: string;
  cycleId: string;
  accountId: string;
  amount: string;
  transactionDate: string;
  sourceName: string;
  incomeKind: IncomeKind;
  expectedIncomeId: string | null;
  status: 'POSTED';
  isPartial: boolean;
  postedAt: string;
}

export interface IncomeVariance {
  status: IncomeVarianceStatus;
  expectedAmount: string | null;
  actualLinkedAmount: string;
  difference: string;
  requiresPlanReview: boolean;
  surplusIsFlexible: false;
}

export interface RecordIncomeResult {
  transaction: IncomeTransactionView;
  variance: IncomeVariance;
  accountBalance: string;
}
