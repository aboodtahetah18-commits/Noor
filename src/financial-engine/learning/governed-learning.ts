export type CauseClassification =
  | 'ESTIMATION_ERROR'
  | 'DATA_ERROR'
  | 'USER_BEHAVIOR_VARIANCE'
  | 'EXECUTION_VARIANCE'
  | 'EXTERNAL_SHOCK'
  | 'POLICY_GAP'
  | 'ALGORITHM_GAP'
  | 'MODEL_CALIBRATION_ERROR'
  | 'ASSUMPTION_FAILURE'
  | 'NO_MATERIAL_ERROR';

export type LearningAction =
  | 'EXCLUDE_FROM_LEARNING'
  | 'USER_PROFILE_UPDATE_CANDIDATE'
  | 'STRESS_SCENARIO_ONLY'
  | 'BOUNDED_CALIBRATION_CANDIDATE'
  | 'CHANGE_PROPOSAL_REQUIRED'
  | 'ASSUMPTION_RELIABILITY_UPDATE'
  | 'NO_CHANGE';

export interface VersionBundle {
  policyVersion: string;
  algorithmVersion: string;
  modelVersion: string;
  parameterVersion: string;
}

export interface LearningEvidence {
  caseId: string;
  decisionId: string;
  learningReviewCompleted: boolean;
  cause: CauseClassification;
  sampleCount: number;
  evidenceConfidence: number;
  expectedValue?: number;
  actualValue?: number;
  versions: VersionBundle;
}

export interface ParameterEnvelope {
  parameter: string;
  currentValue: number;
  min: number;
  max: number;
  maxStep: number;
}

export interface CalibrationCandidate {
  parameter: string;
  previousValue: number;
  proposedValue: number;
  boundedDelta: number;
  evidenceCaseId: string;
  sourceVersions: VersionBundle;
  requiresBacktest: true;
  requiresApproval: true;
}

export interface LearningDecision {
  action: LearningAction;
  reason: string;
  candidate?: CalibrationCandidate;
}

export interface PromotionGate {
  backtestStatus: 'PASSED' | 'FAILED' | 'NOT_RUN';
  proposalStatus: 'APPROVED' | 'REJECTED' | 'PENDING';
}

const MIN_CALIBRATION_SAMPLES = 5;
const MIN_EVIDENCE_CONFIDENCE = 0.7;

function assertFiniteEnvelope(envelope: ParameterEnvelope) {
  const values = [envelope.currentValue, envelope.min, envelope.max, envelope.maxStep];
  if (!values.every(Number.isFinite)) throw new Error('Parameter envelope values must be finite');
  if (envelope.min > envelope.max) throw new Error('Parameter envelope min cannot exceed max');
  if (envelope.currentValue < envelope.min || envelope.currentValue > envelope.max) {
    throw new Error('Current parameter value is outside its governed envelope');
  }
  if (envelope.maxStep <= 0) throw new Error('maxStep must be greater than zero');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Produces a candidate only. It never mutates the approved parameter registry.
 * This preserves the governed flow: learning review -> candidate -> backtest -> approval -> release.
 */
export function evaluateLearning(
  evidence: LearningEvidence,
  envelope?: ParameterEnvelope,
): LearningDecision {
  if (!evidence.learningReviewCompleted) {
    return { action: 'EXCLUDE_FROM_LEARNING', reason: 'LEARNING_REVIEW is required before any adaptation.' };
  }
  if (evidence.evidenceConfidence < 0 || evidence.evidenceConfidence > 1) {
    throw new Error('evidenceConfidence must be between 0 and 1');
  }

  switch (evidence.cause) {
    case 'DATA_ERROR':
      return { action: 'EXCLUDE_FROM_LEARNING', reason: 'Bad input data must not train or calibrate the decision engine.' };
    case 'EXECUTION_VARIANCE':
      return { action: 'EXCLUDE_FROM_LEARNING', reason: 'Execution variance is not an algorithm error.' };
    case 'EXTERNAL_SHOCK':
      return { action: 'STRESS_SCENARIO_ONLY', reason: 'External shocks are retained for stress scenarios, not baseline calibration.' };
    case 'USER_BEHAVIOR_VARIANCE':
      return { action: 'USER_PROFILE_UPDATE_CANDIDATE', reason: 'Behavioral evidence may update the user-specific profile, never global hard rules.' };
    case 'POLICY_GAP':
    case 'ALGORITHM_GAP':
      return { action: 'CHANGE_PROPOSAL_REQUIRED', reason: 'Policy/algorithm gaps require governed design change, not silent online learning.' };
    case 'ASSUMPTION_FAILURE':
      return { action: 'ASSUMPTION_RELIABILITY_UPDATE', reason: 'Update assumption reliability rather than decision weights directly.' };
    case 'NO_MATERIAL_ERROR':
      return { action: 'NO_CHANGE', reason: 'Outcome supplies validation evidence without requiring a parameter change.' };
    case 'ESTIMATION_ERROR':
    case 'MODEL_CALIBRATION_ERROR':
      break;
  }

  if (!envelope) {
    return { action: 'CHANGE_PROPOSAL_REQUIRED', reason: 'No governed parameter envelope is defined for bounded calibration.' };
  }
  assertFiniteEnvelope(envelope);

  if (evidence.sampleCount < MIN_CALIBRATION_SAMPLES || evidence.evidenceConfidence < MIN_EVIDENCE_CONFIDENCE) {
    return { action: 'NO_CHANGE', reason: 'Evidence threshold for bounded calibration has not been met.' };
  }
  if (!Number.isFinite(evidence.expectedValue) || !Number.isFinite(evidence.actualValue)) {
    return { action: 'NO_CHANGE', reason: 'Calibration requires finite expected and actual outcomes.' };
  }

  const residual = (evidence.actualValue as number) - (evidence.expectedValue as number);
  const direction = Math.sign(residual);
  const magnitude = Math.min(Math.abs(residual), envelope.maxStep);
  const proposedValue = clamp(envelope.currentValue + direction * magnitude, envelope.min, envelope.max);
  const boundedDelta = proposedValue - envelope.currentValue;

  if (boundedDelta === 0) {
    return { action: 'NO_CHANGE', reason: 'The governed envelope prevents any safe parameter adjustment.' };
  }

  return {
    action: 'BOUNDED_CALIBRATION_CANDIDATE',
    reason: 'Eligible outcome produced a bounded candidate; release still requires backtest and approval.',
    candidate: {
      parameter: envelope.parameter,
      previousValue: envelope.currentValue,
      proposedValue,
      boundedDelta,
      evidenceCaseId: evidence.caseId,
      sourceVersions: evidence.versions,
      requiresBacktest: true,
      requiresApproval: true,
    },
  };
}

/** A candidate can become releasable only through both governance gates. */
export function canPromoteCalibration(gate: PromotionGate): boolean {
  return gate.backtestStatus === 'PASSED' && gate.proposalStatus === 'APPROVED';
}

/** EWMA drift signal for monitoring; it does not change parameters. */
export function nextDriftScore(previousScore: number, normalizedResidual: number, alpha = 0.2): number {
  if (![previousScore, normalizedResidual, alpha].every(Number.isFinite)) throw new Error('Drift inputs must be finite');
  if (alpha <= 0 || alpha > 1) throw new Error('alpha must be in (0, 1]');
  return alpha * Math.abs(normalizedResidual) + (1 - alpha) * previousScore;
}
