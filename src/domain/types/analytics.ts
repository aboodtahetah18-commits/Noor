export const DEFICIT_RISK_STATUSES = ["NO_DEFICIT", "DEFICIT_RISK"] as const;
export type DeficitRiskStatus = (typeof DEFICIT_RISK_STATUSES)[number];

export const SAFE_TO_SPEND_STATUSES = ["AVAILABLE", "ZERO"] as const;
export type SafeToSpendStatus = (typeof SAFE_TO_SPEND_STATUSES)[number];

export const CYCLE_REVIEW_STATUSES = ["GENERATING", "READY", "ARCHIVED", "FAILED"] as const;
export type CycleReviewStatus = (typeof CYCLE_REVIEW_STATUSES)[number];
