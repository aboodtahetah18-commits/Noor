import { randomUUID } from 'node:crypto';

export type DecisionLifecycleState =
  | 'PROPOSED'
  | 'REVIEWED'
  | 'USER_CONFIRMED'
  | 'EVIDENCE_REQUIRED'
  | 'VERIFIED'
  | 'APPLIED'
  | 'FOLLOWUP'
  | 'BLOCKED'
  | 'CANCELLED';

export type DecisionLifecycleSource =
  | 'CENTRAL'
  | 'SOLVENCY'
  | 'ASSETS'
  | 'HILAL'
  | 'ADVISOR'
  | 'COUNCIL';

export type DecisionLifecycleEnvelope = {
  decision_reference: string;
  source: DecisionLifecycleSource;
  state: DecisionLifecycleState;
  previous_state: DecisionLifecycleState | null;
  execution_boundary: 'advisory_only';
  user_execution_required: boolean;
  evidence_required_before_applied: boolean;
  updated_at: string;
};

const ALLOWED_TRANSITIONS: Record<DecisionLifecycleState, DecisionLifecycleState[]> = {
  PROPOSED: ['REVIEWED', 'BLOCKED', 'CANCELLED'],
  REVIEWED: ['USER_CONFIRMED', 'BLOCKED', 'CANCELLED'],
  USER_CONFIRMED: ['EVIDENCE_REQUIRED', 'VERIFIED', 'CANCELLED'],
  EVIDENCE_REQUIRED: ['VERIFIED', 'CANCELLED'],
  VERIFIED: ['APPLIED', 'FOLLOWUP'],
  APPLIED: ['FOLLOWUP'],
  FOLLOWUP: ['FOLLOWUP', 'BLOCKED'],
  BLOCKED: ['REVIEWED', 'CANCELLED'],
  CANCELLED: [],
};

export function canTransitionDecisionLifecycle(
  from: DecisionLifecycleState,
  to: DecisionLifecycleState,
) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertDecisionLifecycleTransition(
  from: DecisionLifecycleState,
  to: DecisionLifecycleState,
) {
  if (!canTransitionDecisionLifecycle(from, to)) {
    throw new Error(`DECISION_LIFECYCLE_TRANSITION_INVALID:${from}->${to}`);
  }
}

export function createDecisionLifecycleEnvelope(input: {
  source: DecisionLifecycleSource;
  state: DecisionLifecycleState;
  decisionReference?: string;
  previousState?: DecisionLifecycleState | null;
  now?: string;
}): DecisionLifecycleEnvelope {
  if (input.previousState) {
    assertDecisionLifecycleTransition(input.previousState, input.state);
  }

  return {
    decision_reference: input.decisionReference ?? `DEC-${randomUUID()}`,
    source: input.source,
    state: input.state,
    previous_state: input.previousState ?? null,
    execution_boundary: 'advisory_only',
    user_execution_required: true,
    evidence_required_before_applied: true,
    updated_at: input.now ?? new Date().toISOString(),
  };
}

export function lifecycleStateForMessage(input: {
  blocked?: boolean;
  requiresEvidence?: boolean;
  verified?: boolean;
  applied?: boolean;
  followup?: boolean;
  userConfirmed?: boolean;
}): DecisionLifecycleState {
  if (input.blocked) return 'BLOCKED';
  if (input.followup) return 'FOLLOWUP';
  if (input.applied) return 'APPLIED';
  if (input.verified) return 'VERIFIED';
  if (input.requiresEvidence) return 'EVIDENCE_REQUIRED';
  if (input.userConfirmed) return 'USER_CONFIRMED';
  return 'REVIEWED';
}
