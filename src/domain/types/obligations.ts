export const OBLIGATION_STATUSES = ["UPCOMING", "DUE", "OVERDUE", "PAID", "CANCELLED"] as const;
export type ObligationStatus = (typeof OBLIGATION_STATUSES)[number];

export const OBLIGATION_RECURRENCES = [
  "ONCE",
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "ANNUAL",
] as const;
export type ObligationRecurrence = (typeof OBLIGATION_RECURRENCES)[number];
