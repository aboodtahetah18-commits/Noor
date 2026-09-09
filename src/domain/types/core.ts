export const BASE_CURRENCIES = ["SAR"] as const;
export type BaseCurrency = (typeof BASE_CURRENCIES)[number];

export const ACCOUNT_TYPES = ["BANK", "SAVINGS", "CASH", "OTHER"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const FINANCIAL_CYCLE_STATUSES = ["DRAFT", "ACTIVE", "CLOSING", "CLOSED"] as const;
export type FinancialCycleStatus = (typeof FINANCIAL_CYCLE_STATUSES)[number];

export const FINANCIAL_PLAN_STATUSES = [
  "PLAN_DRAFT",
  "ACTIVE_PLAN",
  "REVISED",
  "CLOSED_PLAN",
] as const;
export type FinancialPlanStatus = (typeof FINANCIAL_PLAN_STATUSES)[number];

export const BUDGET_CATEGORY_STATUSES = ["NORMAL", "AT_RISK", "OVER_BUDGET"] as const;
export type BudgetCategoryStatus = (typeof BUDGET_CATEGORY_STATUSES)[number];

export const CATEGORY_GROUPS = [
  "OBLIGATION",
  "ESSENTIAL",
  "SAVING",
  "EMERGENCY",
  "GOAL",
  "FLEXIBLE",
] as const;
export type CategoryGroup = (typeof CATEGORY_GROUPS)[number];

export const ALLOCATION_TYPES = CATEGORY_GROUPS;
export type AllocationType = CategoryGroup;
