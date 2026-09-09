import type {
  AllocationStatus,
  FinancialCycleEvent,
  FinancialCycleStatus,
  FinancialPlanEvent,
  FinancialPlanStatus,
  GoalEvent,
  GoalStatus,
  ObligationEvent,
  ObligationStatus,
  RecommendationEvent,
  RecommendationStatus,
  TransactionEvent,
  TransactionStatus,
  AllocationEvent,
} from "@/domain/types";

export type TransitionTable<State extends string, Event extends string> = Readonly<
  Partial<Record<State, Readonly<Partial<Record<Event, State>>>>>
>;

export const financialCycleTransitions = {
  DRAFT: { ACTIVATE_CYCLE: "ACTIVE" },
  ACTIVE: { START_CLOSING: "CLOSING" },
  CLOSING: { COMPLETE_CLOSING: "CLOSED" },
} as const satisfies TransitionTable<FinancialCycleStatus, FinancialCycleEvent>;

export const financialPlanTransitions = {
  PLAN_DRAFT: { APPROVE_PLAN: "ACTIVE_PLAN" },
  ACTIVE_PLAN: { REVISE_PLAN: "REVISED", CLOSE_PLAN_WITH_CYCLE: "CLOSED_PLAN" },
  REVISED: { APPROVE_REVISION: "ACTIVE_PLAN" },
} as const satisfies TransitionTable<FinancialPlanStatus, FinancialPlanEvent>;

export const obligationTransitions = {
  UPCOMING: {
    MARK_DUE: "DUE",
    PAY_OBLIGATION: "PAID",
    CANCEL_OBLIGATION: "CANCELLED",
  },
  DUE: { MARK_OVERDUE: "OVERDUE", PAY_OBLIGATION: "PAID" },
  OVERDUE: { PAY_OBLIGATION: "PAID" },
} as const satisfies TransitionTable<ObligationStatus, ObligationEvent>;

export const goalTransitions = {
  DRAFT: { ACTIVATE_GOAL: "ACTIVE", CANCEL_GOAL: "CANCELLED" },
  ACTIVE: {
    MARK_FINANCIALLY_UNREALISTIC: "FINANCIALLY_UNREALISTIC",
    PAUSE_GOAL: "PAUSED",
    ACHIEVE_GOAL: "ACHIEVED",
    CANCEL_GOAL: "CANCELLED",
  },
  FINANCIALLY_UNREALISTIC: {
    RESTORE_GOAL_ACTIVE: "ACTIVE",
    ACHIEVE_GOAL: "ACHIEVED",
    CANCEL_GOAL: "CANCELLED",
  },
  PAUSED: { RESUME_GOAL: "ACTIVE", CANCEL_GOAL: "CANCELLED" },
} as const satisfies TransitionTable<GoalStatus, GoalEvent>;

export const transactionTransitions = {
  PENDING: { POST_TRANSACTION: "POSTED", FAIL_TRANSACTION: "FAILED" },
  POSTED: { REVERSE_TRANSACTION: "REVERSED" },
} as const satisfies TransitionTable<TransactionStatus, TransactionEvent>;

export const allocationTransitions = {
  PLANNED: { ALLOCATE: "ALLOCATED", CANCEL_ALLOCATION: "CANCELLED" },
  ALLOCATED: {
    TRANSFER_PARTIALLY: "PARTIALLY_TRANSFERRED",
    TRANSFER_FULLY: "TRANSFERRED",
    CANCEL_ALLOCATION: "CANCELLED",
  },
  PARTIALLY_TRANSFERRED: {
    TRANSFER_FULLY: "TRANSFERRED",
    CANCEL_ALLOCATION: "CANCELLED",
  },
} as const satisfies TransitionTable<AllocationStatus, AllocationEvent>;

export const recommendationTransitions = {
  NEW: {
    VIEW_RECOMMENDATION: "VIEWED",
    ACCEPT_RECOMMENDATION: "ACCEPTED",
    DISMISS_RECOMMENDATION: "DISMISSED",
    EXPIRE_RECOMMENDATION: "EXPIRED",
    RESOLVE_RECOMMENDATION: "RESOLVED",
  },
  VIEWED: {
    ACCEPT_RECOMMENDATION: "ACCEPTED",
    DISMISS_RECOMMENDATION: "DISMISSED",
    EXPIRE_RECOMMENDATION: "EXPIRED",
    RESOLVE_RECOMMENDATION: "RESOLVED",
  },
  ACCEPTED: { RESOLVE_RECOMMENDATION: "RESOLVED" },
} as const satisfies TransitionTable<RecommendationStatus, RecommendationEvent>;
