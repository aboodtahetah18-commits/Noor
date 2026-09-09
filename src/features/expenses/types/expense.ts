import type { BudgetCategoryStatus, ExpenseNature, PlanningStatus } from '@/domain/types';

export interface ExpenseTransactionView {
  id: string;
  cycleId: string;
  accountId: string;
  categoryId: string;
  amount: string;
  transactionDate: string;
  planningStatus: PlanningStatus;
  expenseNature: ExpenseNature;
  description: string | null;
  status: 'POSTED';
  postedAt: string;
}

export interface ExpenseListItem {
  id: string;
  cycle_id: string;
  account_id: string;
  category_id: string;
  amount: string;
  transaction_date: string;
  planning_status: PlanningStatus;
  expense_nature: ExpenseNature;
  description: string | null;
  posted_at: string;
  category_name: string;
  account_name: string;
}

export interface ExpenseBudgetImpact {
  categoryId: string;
  categoryName: string;
  planned: string;
  actual: string;
  remaining: string;
  utilizationPercent: string | null;
  hasSpendAgainstZeroBudget: boolean;
  status: BudgetCategoryStatus;
  atRiskEvaluation: 'P56_LINEAR_PACE_RULE' | 'NOT_APPLICABLE_OVER_BUDGET';
}

export interface ExpenseFinancialImpact {
  accountBalance: string;
  totalLiquidity: string;
  knownProtectedAmountsBeforeBuffer: string;
  baseAvailableBeforeRequiredBuffer: string;
  safeToSpend: { amount: string|null; previousAmount: string|null; change: string|null; status: 'AVAILABLE'|'ZERO'|'BUFFER_POLICY_REQUIRED'; blockingIssue: null };
  dailySafeLimit: { amount: string|null; status: 'AVAILABLE'|'ZERO'|'BUFFER_POLICY_REQUIRED' };
  expectedDeficit: { amount: string|null; status: 'NO_DEFICIT'|'DEFICIT_RISK'|'BUFFER_POLICY_REQUIRED' };
}

export interface RecordExpenseResult {
  transaction: ExpenseTransactionView;
  budgetImpact: ExpenseBudgetImpact;
  financialImpact: ExpenseFinancialImpact;
}
