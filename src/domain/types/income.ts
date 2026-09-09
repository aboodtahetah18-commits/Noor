export const INCOME_KINDS = ["SALARY", "ADDITIONAL_INCOME", "BONUS", "OTHER"] as const;
export type IncomeKind = (typeof INCOME_KINDS)[number];
