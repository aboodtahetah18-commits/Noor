export const GOAL_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "FINANCIALLY_UNREALISTIC",
  "PAUSED",
  "ACHIEVED",
  "CANCELLED",
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
