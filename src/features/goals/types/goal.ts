import type { GoalStatus } from '@/domain/types/goals';

export type GoalFeasibilityStatus = 'ACTIVE_COMPATIBLE' | 'FINANCIALLY_UNREALISTIC' | 'CAPACITY_UNAVAILABLE';

export interface GoalAnalysis {
  remainingAmount: string;
  remainingCycles: number | null;
  requiredContribution: string | null;
  availableFinancialCapacity: string | null;
  feasibilityStatus: GoalFeasibilityStatus;
}

export interface GoalListItem extends GoalAnalysis {
  id: string;
  name: string;
  status: GoalStatus;
  targetAmount: string;
  currentBalance: string;
  progressPercent: string;
  startDate: string;
  targetDate: string | null;
  priority: number | null;
  achievedAt: string | null;
  cancelledAt: string | null;
}

export interface GoalContributionResult {
  transactionId: string;
  goalId: string;
  amount: string;
  currentBalance: string;
  remainingAmount: string;
  progressPercent: string;
  status: GoalStatus;
  cashLedgerEffect: 'SOURCE_ACCOUNT_DEBIT';
}
