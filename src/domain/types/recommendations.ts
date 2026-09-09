export const RECOMMENDATION_STATUSES = [
  "NEW",
  "VIEWED",
  "ACCEPTED",
  "DISMISSED",
  "EXPIRED",
  "RESOLVED",
] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const RECOMMENDATION_TYPES = [
  "WARNING",
  "OPPORTUNITY",
  "CORRECTION",
  "GOAL",
  "POSITIVE",
] as const;
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];
