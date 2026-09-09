export const TRANSACTION_TYPES = [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "REFUND",
  "SAVING_TRANSFER",
  "EMERGENCY_CONTRIBUTION",
  "EMERGENCY_WITHDRAWAL",
  "GOAL_CONTRIBUTION",
  "OBLIGATION_PAYMENT",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ["PENDING", "POSTED", "REVERSED", "FAILED"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const PLANNING_STATUSES = ["PLANNED", "UNPLANNED"] as const;
export type PlanningStatus = (typeof PLANNING_STATUSES)[number];

export const EXPENSE_NATURES = [
  "NECESSARY",
  "IMPORTANT",
  "OPTIONAL",
  "ENTERTAINMENT",
  "UNPLANNED",
] as const;
export type ExpenseNature = (typeof EXPENSE_NATURES)[number];

export const DEFAULT_EXPENSE_NATURES = [
  "NECESSARY",
  "IMPORTANT",
  "OPTIONAL",
  "ENTERTAINMENT",
] as const;
export type DefaultExpenseNature = (typeof DEFAULT_EXPENSE_NATURES)[number];
