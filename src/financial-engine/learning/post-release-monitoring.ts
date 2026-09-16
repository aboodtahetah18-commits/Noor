import { nextDriftScore } from './governed-learning';

export type DriftSeverity = 'NORMAL' | 'EARLY_WARNING' | 'REVIEW_REQUIRED' | 'ROLLBACK_REVIEW_CANDIDATE';
export type PostReleaseAction = 'CONTINUE_MONITORING' | 'OPEN_REVIEW' | 'PROPOSE_ROLLBACK_REVIEW';

export interface PostReleaseThresholds {
  earlyWarning: number;
  reviewRequired: number;
  rollbackReview: number;
  alpha?: number;
}

export interface PostReleaseObservation {
  releaseId: string;
  metricKey: string;
  previousDriftScore: number;
  normalizedResidual: number;
  evidenceCount: number;
  confidence: number;
  thresholds: PostReleaseThresholds;
}

export interface PostReleaseAssessment {
  driftScore: number;
  severity: DriftSeverity;
  action: PostReleaseAction;
  reasons: string[];
}

function validateThresholds(t: PostReleaseThresholds): void {
  if (![t.earlyWarning, t.reviewRequired, t.rollbackReview].every(Number.isFinite)) {
    throw new Error('POST_RELEASE_THRESHOLDS_MUST_BE_FINITE');
  }
  if (!(t.earlyWarning > 0 && t.earlyWarning < t.reviewRequired && t.reviewRequired < t.rollbackReview)) {
    throw new Error('POST_RELEASE_THRESHOLDS_MUST_BE_STRICTLY_ORDERED');
  }
}

export function assessPostReleaseObservation(input: PostReleaseObservation): PostReleaseAssessment {
  if (!input.releaseId.trim()) throw new Error('POST_RELEASE_RELEASE_ID_REQUIRED');
  if (!input.metricKey.trim()) throw new Error('POST_RELEASE_METRIC_KEY_REQUIRED');
  if (input.evidenceCount < 1) throw new Error('POST_RELEASE_EVIDENCE_REQUIRED');
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) {
    throw new Error('POST_RELEASE_CONFIDENCE_INVALID');
  }
  validateThresholds(input.thresholds);

  const driftScore = nextDriftScore(
    input.previousDriftScore,
    input.normalizedResidual,
    input.thresholds.alpha ?? 0.2,
  );
  const reasons = [`EWMA drift=${driftScore.toFixed(6)} from normalized residual=${input.normalizedResidual}.`];

  if (driftScore >= input.thresholds.rollbackReview) {
    return {
      driftScore,
      severity: 'ROLLBACK_REVIEW_CANDIDATE',
      action: 'PROPOSE_ROLLBACK_REVIEW',
      reasons: [...reasons, 'Drift crossed rollback-review threshold. This proposes review only; no rollback is executed automatically.'],
    };
  }
  if (driftScore >= input.thresholds.reviewRequired) {
    return {
      driftScore,
      severity: 'REVIEW_REQUIRED',
      action: 'OPEN_REVIEW',
      reasons: [...reasons, 'Drift crossed governed review threshold.'],
    };
  }
  if (driftScore >= input.thresholds.earlyWarning) {
    return {
      driftScore,
      severity: 'EARLY_WARNING',
      action: 'CONTINUE_MONITORING',
      reasons: [...reasons, 'Drift crossed early-warning threshold but has not reached review threshold.'],
    };
  }
  return {
    driftScore,
    severity: 'NORMAL',
    action: 'CONTINUE_MONITORING',
    reasons: [...reasons, 'Drift remains below the early-warning threshold.'],
  };
}
