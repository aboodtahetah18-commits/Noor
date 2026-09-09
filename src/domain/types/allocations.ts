export const ALLOCATION_STATUSES = [
  "PLANNED",
  "ALLOCATED",
  "PARTIALLY_TRANSFERRED",
  "TRANSFERRED",
  "CANCELLED",
] as const;

export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];
export type SavingAllocationStatus = AllocationStatus;
export type EmergencyAllocationStatus = AllocationStatus;
export type GoalAllocationStatus = AllocationStatus;
