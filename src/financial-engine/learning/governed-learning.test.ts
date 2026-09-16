import { describe, expect, it } from 'vitest';
import { canPromoteCalibration, evaluateLearning, nextDriftScore, type LearningEvidence } from './governed-learning';

const versions = {
  policyVersion: '1.0',
  algorithmVersion: '1.0',
  modelVersion: '1.0',
  parameterVersion: '1.0',
};

function evidence(overrides: Partial<LearningEvidence> = {}): LearningEvidence {
  return {
    caseId: 'CASE-1',
    decisionId: 'DEC-1',
    learningReviewCompleted: true,
    cause: 'MODEL_CALIBRATION_ERROR',
    sampleCount: 12,
    evidenceConfidence: 0.9,
    expectedValue: 10,
    actualValue: 14,
    versions,
    ...overrides,
  };
}

const envelope = { parameter: 'riskWeight', currentValue: 0.5, min: 0.2, max: 0.8, maxStep: 0.05 };

describe('governed adaptive learning', () => {
  it('never learns from DATA_ERROR', () => {
    expect(evaluateLearning(evidence({ cause: 'DATA_ERROR' }), envelope).action).toBe('EXCLUDE_FROM_LEARNING');
  });

  it('never treats execution variance as an algorithm error', () => {
    expect(evaluateLearning(evidence({ cause: 'EXECUTION_VARIANCE' }), envelope).action).toBe('EXCLUDE_FROM_LEARNING');
  });

  it('routes algorithm gaps to governed change proposals', () => {
    expect(evaluateLearning(evidence({ cause: 'ALGORITHM_GAP' }), envelope).action).toBe('CHANGE_PROPOSAL_REQUIRED');
  });

  it('keeps user behavior learning user-specific', () => {
    expect(evaluateLearning(evidence({ cause: 'USER_BEHAVIOR_VARIANCE' }), envelope).action).toBe('USER_PROFILE_UPDATE_CANDIDATE');
  });

  it('requires learning review before adaptation', () => {
    expect(evaluateLearning(evidence({ learningReviewCompleted: false }), envelope).action).toBe('EXCLUDE_FROM_LEARNING');
  });

  it('creates bounded calibration candidates and never mutates beyond maxStep', () => {
    const result = evaluateLearning(evidence(), envelope);
    expect(result.action).toBe('BOUNDED_CALIBRATION_CANDIDATE');
    expect(result.candidate?.proposedValue).toBeCloseTo(0.55);
    expect(result.candidate?.requiresBacktest).toBe(true);
    expect(result.candidate?.requiresApproval).toBe(true);
  });

  it('cannot release without both passed backtest and approval', () => {
    expect(canPromoteCalibration({ backtestStatus: 'PASSED', proposalStatus: 'PENDING' })).toBe(false);
    expect(canPromoteCalibration({ backtestStatus: 'NOT_RUN', proposalStatus: 'APPROVED' })).toBe(false);
    expect(canPromoteCalibration({ backtestStatus: 'PASSED', proposalStatus: 'APPROVED' })).toBe(true);
  });

  it('computes drift as monitoring evidence without changing parameters', () => {
    expect(nextDriftScore(0.2, -0.6, 0.25)).toBeCloseTo(0.3);
  });
});
