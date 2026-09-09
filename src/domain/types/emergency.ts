export const EMERGENCY_FUND_STATUSES = [
  "NOT_CONFIGURED",
  "BUILDING",
  "FUNDED",
  "DEPLETED",
] as const;
export type EmergencyFundStatus = (typeof EMERGENCY_FUND_STATUSES)[number];
