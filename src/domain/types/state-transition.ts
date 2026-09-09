import type { AllocationStatus } from "./allocations";
import type { FinancialCycleStatus, FinancialPlanStatus } from "./core";
import type { GoalStatus } from "./goals";
import type { ObligationStatus } from "./obligations";
import type { RecommendationStatus } from "./recommendations";
import type { TransactionStatus } from "./transactions";

export const WORKFLOW_ENTITY_TYPES = [
  "FINANCIAL_CYCLE",
  "FINANCIAL_PLAN",
  "OBLIGATION",
  "GOAL",
  "TRANSACTION",
  "SAVING_ALLOCATION",
  "EMERGENCY_ALLOCATION",
  "GOAL_ALLOCATION",
  "RECOMMENDATION",
] as const;
export type WorkflowEntityType = (typeof WORKFLOW_ENTITY_TYPES)[number];

export const FINANCIAL_CYCLE_EVENTS = [
  "ACTIVATE_CYCLE",
  "START_CLOSING",
  "COMPLETE_CLOSING",
] as const;
export type FinancialCycleEvent = (typeof FINANCIAL_CYCLE_EVENTS)[number];

export const FINANCIAL_PLAN_EVENTS = [
  "APPROVE_PLAN",
  "REVISE_PLAN",
  "APPROVE_REVISION",
  "CLOSE_PLAN_WITH_CYCLE",
] as const;
export type FinancialPlanEvent = (typeof FINANCIAL_PLAN_EVENTS)[number];

export const OBLIGATION_EVENTS = [
  "MARK_DUE",
  "MARK_OVERDUE",
  "PAY_OBLIGATION",
  "CANCEL_OBLIGATION",
] as const;
export type ObligationEvent = (typeof OBLIGATION_EVENTS)[number];

export const GOAL_EVENTS = [
  "ACTIVATE_GOAL",
  "MARK_FINANCIALLY_UNREALISTIC",
  "RESTORE_GOAL_ACTIVE",
  "PAUSE_GOAL",
  "RESUME_GOAL",
  "ACHIEVE_GOAL",
  "CANCEL_GOAL",
] as const;
export type GoalEvent = (typeof GOAL_EVENTS)[number];

export const TRANSACTION_EVENTS = ["POST_TRANSACTION", "FAIL_TRANSACTION", "REVERSE_TRANSACTION"] as const;
export type TransactionEvent = (typeof TRANSACTION_EVENTS)[number];

export const ALLOCATION_EVENTS = [
  "ALLOCATE",
  "TRANSFER_PARTIALLY",
  "TRANSFER_FULLY",
  "CANCEL_ALLOCATION",
] as const;
export type AllocationEvent = (typeof ALLOCATION_EVENTS)[number];

export const RECOMMENDATION_EVENTS = [
  "VIEW_RECOMMENDATION",
  "ACCEPT_RECOMMENDATION",
  "DISMISS_RECOMMENDATION",
  "EXPIRE_RECOMMENDATION",
  "RESOLVE_RECOMMENDATION",
] as const;
export type RecommendationEvent = (typeof RECOMMENDATION_EVENTS)[number];

export interface WorkflowStateByEntity {
  FINANCIAL_CYCLE: FinancialCycleStatus;
  FINANCIAL_PLAN: FinancialPlanStatus;
  OBLIGATION: ObligationStatus;
  GOAL: GoalStatus;
  TRANSACTION: TransactionStatus;
  SAVING_ALLOCATION: AllocationStatus;
  EMERGENCY_ALLOCATION: AllocationStatus;
  GOAL_ALLOCATION: AllocationStatus;
  RECOMMENDATION: RecommendationStatus;
}

export interface WorkflowEventByEntity {
  FINANCIAL_CYCLE: FinancialCycleEvent;
  FINANCIAL_PLAN: FinancialPlanEvent;
  OBLIGATION: ObligationEvent;
  GOAL: GoalEvent;
  TRANSACTION: TransactionEvent;
  SAVING_ALLOCATION: AllocationEvent;
  EMERGENCY_ALLOCATION: AllocationEvent;
  GOAL_ALLOCATION: AllocationEvent;
  RECOMMENDATION: RecommendationEvent;
}

export type WorkflowState<E extends WorkflowEntityType> = WorkflowStateByEntity[E];
export type WorkflowEvent<E extends WorkflowEntityType> = WorkflowEventByEntity[E];
