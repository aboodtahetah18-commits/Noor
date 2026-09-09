import type { WorkflowEntityType } from "@/domain/types";

export class InvalidStateTransitionError extends Error {
  readonly code = "INVALID_STATE_TRANSITION" as const;

  constructor(
    readonly entityType: WorkflowEntityType,
    readonly currentState: string,
    readonly event: string,
  ) {
    super(`Invalid transition for ${entityType}: ${currentState} + ${event}`);
    this.name = "InvalidStateTransitionError";
  }
}

export class StateTransitionPreconditionError extends Error {
  readonly code = "STATE_TRANSITION_PRECONDITION_FAILED" as const;

  constructor(
    readonly entityType: WorkflowEntityType,
    readonly currentState: string,
    readonly event: string,
    readonly failedPreconditions: readonly string[],
  ) {
    super(
      `Transition preconditions failed for ${entityType}: ${failedPreconditions.join(", ")}`,
    );
    this.name = "StateTransitionPreconditionError";
  }
}
