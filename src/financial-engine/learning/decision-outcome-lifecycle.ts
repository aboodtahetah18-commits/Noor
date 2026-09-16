import type { CauseClassification, LearningEvidence, VersionBundle } from './governed-learning';

export type ExecutionProofStatus = 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type MonitoringStatus = 'NOT_STARTED' | 'ACTIVE' | 'COMPLETE' | 'FAILED';
export type OutcomeStatus = 'NOT_AVAILABLE' | 'PARTIAL' | 'MEASURED' | 'INVALID';
export type SettlementStatus = 'NOT_REQUIRED' | 'PENDING' | 'SETTLED' | 'FAILED';
export type LearningReviewStatus = 'NOT_READY' | 'READY' | 'COMPLETED' | 'REJECTED';

export interface DecisionOutcomeLifecycleInput {
  caseId: string;
  decisionId: string;
  userDecisionStatus: string | null;
  executionTaskStatus: string | null;
  latestExecutionStatus: string | null;
  pendingEvidenceCount: number;
  matchedEvidenceCount: number;
  monitoringStatus: string | null;
  outcomeStatus: string | null;
  settlementStatus: string | null;
  learningReviewStatus: string | null;
  expectedValue?: number;
  actualValue?: number;
  sampleCount: number;
  evidenceConfidence: number;
  cause?: CauseClassification;
  versions: VersionBundle;
}

export interface DecisionOutcomeGate {
  executionProof: ExecutionProofStatus;
  monitoring: MonitoringStatus;
  outcome: OutcomeStatus;
  settlement: SettlementStatus;
  learningReview: LearningReviewStatus;
  eligibleForLearning: boolean;
  blockers: string[];
}

const USER_ACCEPTED = new Set(['APPROVED', 'ACCEPTED', 'CONFIRMED', 'EXECUTED']);
const EXECUTION_VERIFIED = new Set(['VERIFIED', 'CONFIRMED', 'COMPLETED', 'MATCHED']);
const MONITORING_COMPLETE = new Set(['COMPLETE', 'COMPLETED', 'CLOSED']);
const OUTCOME_MEASURED = new Set(['MEASURED', 'COMPLETED', 'FINAL']);
const SETTLEMENT_COMPLETE = new Set(['SETTLED', 'COMPLETE', 'COMPLETED', 'NOT_REQUIRED']);
const LEARNING_REVIEW_COMPLETE = new Set(['COMPLETED', 'APPROVED']);

function upper(value: string | null): string {
  return String(value ?? '').trim().toUpperCase();
}

export function evaluateDecisionOutcomeLifecycle(input: DecisionOutcomeLifecycleInput): DecisionOutcomeGate {
  const blockers: string[] = [];
  const userDecision = upper(input.userDecisionStatus);
  const executionTask = upper(input.executionTaskStatus);
  const latestExecution = upper(input.latestExecutionStatus);
  const monitoringRaw = upper(input.monitoringStatus);
  const outcomeRaw = upper(input.outcomeStatus);
  const settlementRaw = upper(input.settlementStatus);
  const learningRaw = upper(input.learningReviewStatus);

  if (!USER_ACCEPTED.has(userDecision)) blockers.push('USER_DECISION_NOT_CONFIRMED');

  let executionProof: ExecutionProofStatus = 'PENDING';
  if (executionTask === 'NOT_REQUIRED') executionProof = 'NOT_REQUIRED';
  else if (['REJECTED', 'FAILED', 'INVALID'].includes(latestExecution)) executionProof = 'REJECTED';
  else if (EXECUTION_VERIFIED.has(latestExecution) && input.matchedEvidenceCount > 0 && input.pendingEvidenceCount === 0) executionProof = 'VERIFIED';
  if (!['VERIFIED', 'NOT_REQUIRED'].includes(executionProof)) blockers.push('EXECUTION_NOT_VERIFIED');

  let monitoring: MonitoringStatus = 'NOT_STARTED';
  if (['FAILED', 'INVALID'].includes(monitoringRaw)) monitoring = 'FAILED';
  else if (MONITORING_COMPLETE.has(monitoringRaw)) monitoring = 'COMPLETE';
  else if (['ACTIVE', 'IN_PROGRESS', 'RUNNING'].includes(monitoringRaw)) monitoring = 'ACTIVE';
  if (monitoring !== 'COMPLETE') blockers.push('MONITORING_NOT_COMPLETE');

  let outcome: OutcomeStatus = 'NOT_AVAILABLE';
  if (['INVALID', 'REJECTED', 'FAILED'].includes(outcomeRaw)) outcome = 'INVALID';
  else if (OUTCOME_MEASURED.has(outcomeRaw) && Number.isFinite(input.actualValue)) outcome = 'MEASURED';
  else if (outcomeRaw || Number.isFinite(input.actualValue)) outcome = 'PARTIAL';
  if (outcome !== 'MEASURED') blockers.push('OUTCOME_NOT_MEASURED');

  let settlement: SettlementStatus = 'PENDING';
  if (settlementRaw === 'NOT_REQUIRED') settlement = 'NOT_REQUIRED';
  else if (['FAILED', 'INVALID'].includes(settlementRaw)) settlement = 'FAILED';
  else if (SETTLEMENT_COMPLETE.has(settlementRaw)) settlement = 'SETTLED';
  if (!['SETTLED', 'NOT_REQUIRED'].includes(settlement)) blockers.push('SETTLEMENT_NOT_COMPLETE');

  let learningReview: LearningReviewStatus = 'NOT_READY';
  if (['REJECTED', 'FAILED'].includes(learningRaw)) learningReview = 'REJECTED';
  else if (LEARNING_REVIEW_COMPLETE.has(learningRaw)) learningReview = 'COMPLETED';
  else if (executionProof !== 'REJECTED' && monitoring === 'COMPLETE' && outcome === 'MEASURED' && ['SETTLED', 'NOT_REQUIRED'].includes(settlement)) learningReview = 'READY';
  if (learningReview !== 'COMPLETED') blockers.push('LEARNING_REVIEW_NOT_COMPLETED');

  if (input.sampleCount < 1) blockers.push('NO_LEARNING_SAMPLE');
  if (!Number.isFinite(input.evidenceConfidence) || input.evidenceConfidence < 0 || input.evidenceConfidence > 1) blockers.push('INVALID_EVIDENCE_CONFIDENCE');
  if (!input.cause) blockers.push('CAUSE_CLASSIFICATION_REQUIRED');

  return {
    executionProof,
    monitoring,
    outcome,
    settlement,
    learningReview,
    eligibleForLearning: blockers.length === 0,
    blockers,
  };
}

export function buildLearningEvidenceFromOutcome(input: DecisionOutcomeLifecycleInput): LearningEvidence {
  const gate = evaluateDecisionOutcomeLifecycle(input);
  if (!gate.eligibleForLearning || !input.cause) {
    throw new Error(`DECISION_OUTCOME_NOT_READY_FOR_LEARNING:${gate.blockers.join(',')}`);
  }
  return {
    caseId: input.caseId,
    decisionId: input.decisionId,
    learningReviewCompleted: true,
    cause: input.cause,
    sampleCount: input.sampleCount,
    evidenceConfidence: input.evidenceConfidence,
    expectedValue: input.expectedValue,
    actualValue: input.actualValue,
    versions: input.versions,
  };
}
