import type {
  WorkflowEntityType,
  WorkflowEvent,
  WorkflowState,
} from "@/domain/types";
import {
  allocationTransitions,
  financialCycleTransitions,
  financialPlanTransitions,
  goalTransitions,
  obligationTransitions,
  recommendationTransitions,
  transactionTransitions,
  type TransitionTable,
} from "./definitions";
import { InvalidStateTransitionError, StateTransitionPreconditionError } from "./errors";

export interface TransitionPrecondition {
  readonly code: string;
  readonly satisfied: boolean;
}

export interface TransitionRequest<E extends WorkflowEntityType> {
  readonly entityType: E;
  readonly entityId: string;
  readonly currentState: WorkflowState<E>;
  readonly event: WorkflowEvent<E>;
  readonly occurredAt?: Date;
  readonly reason?: string;
  readonly actorUserId?: string;
  readonly preconditions?: readonly TransitionPrecondition[];
}

export interface TransitionResult<E extends WorkflowEntityType> {
  readonly entityType: E;
  readonly entityId: string;
  readonly previousState: WorkflowState<E>;
  readonly currentState: WorkflowState<E>;
  readonly event: WorkflowEvent<E>;
  readonly transitionTime: Date;
  readonly transitionReason?: string;
  readonly actorUserId?: string;
}

const transitionTables = {
  FINANCIAL_CYCLE: financialCycleTransitions,
  FINANCIAL_PLAN: financialPlanTransitions,
  OBLIGATION: obligationTransitions,
  GOAL: goalTransitions,
  TRANSACTION: transactionTransitions,
  SAVING_ALLOCATION: allocationTransitions,
  EMERGENCY_ALLOCATION: allocationTransitions,
  GOAL_ALLOCATION: allocationTransitions,
  RECOMMENDATION: recommendationTransitions,
} as const;

function lookupNextState<E extends WorkflowEntityType>(
  entityType: E,
  currentState: WorkflowState<E>,
  event: WorkflowEvent<E>,
): WorkflowState<E> | undefined {
  const table = transitionTables[entityType] as unknown as TransitionTable<string, string>;
  return table[currentState]?.[event] as WorkflowState<E> | undefined;
}

export function canTransition<E extends WorkflowEntityType>(
  entityType: E,
  currentState: WorkflowState<E>,
  event: WorkflowEvent<E>,
): boolean {
  return lookupNextState(entityType, currentState, event) !== undefined;
}

export function getNextState<E extends WorkflowEntityType>(
  entityType: E,
  currentState: WorkflowState<E>,
  event: WorkflowEvent<E>,
): WorkflowState<E> {
  const nextState = lookupNextState(entityType, currentState, event);
  if (nextState === undefined) {
    throw new InvalidStateTransitionError(entityType, currentState, event);
  }
  return nextState;
}

export function transition<E extends WorkflowEntityType>(
  request: TransitionRequest<E>,
): TransitionResult<E> {
  const failedPreconditions = (request.preconditions ?? [])
    .filter((condition) => !condition.satisfied)
    .map((condition) => condition.code);

  if (failedPreconditions.length > 0) {
    throw new StateTransitionPreconditionError(
      request.entityType,
      request.currentState,
      request.event,
      failedPreconditions,
    );
  }

  const nextState = getNextState(request.entityType, request.currentState, request.event);

  return {
    entityType: request.entityType,
    entityId: request.entityId,
    previousState: request.currentState,
    currentState: nextState,
    event: request.event,
    transitionTime: request.occurredAt ?? new Date(),
    transitionReason: request.reason,
    actorUserId: request.actorUserId,
  };
}
