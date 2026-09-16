import { describe, expect, it } from 'vitest';
import { assessPostReleaseObservation } from './post-release-monitoring';

const thresholds = { earlyWarning: 0.2, reviewRequired: 0.4, rollbackReview: 0.7, alpha: 1 };

function input(normalizedResidual: number) {
  return {
    releaseId: 'REL-1',
    metricKey: 'prediction_residual',
    previousDriftScore: 0,
    normalizedResidual,
    evidenceCount: 10,
    confidence: 0.9,
    thresholds,
  };
}

describe('post release monitoring', () => {
  it('keeps normal drift in monitoring', () => {
    const result = assessPostReleaseObservation(input(0.1));
    expect(result.severity).toBe('NORMAL');
    expect(result.action).toBe('CONTINUE_MONITORING');
  });

  it('raises early warning without rollback', () => {
    const result = assessPostReleaseObservation(input(0.25));
    expect(result.severity).toBe('EARLY_WARNING');
    expect(result.action).toBe('CONTINUE_MONITORING');
  });

  it('opens review when review threshold is crossed', () => {
    const result = assessPostReleaseObservation(input(0.5));
    expect(result.severity).toBe('REVIEW_REQUIRED');
    expect(result.action).toBe('OPEN_REVIEW');
  });

  it('only proposes rollback review at severe drift', () => {
    const result = assessPostReleaseObservation(input(0.8));
    expect(result.severity).toBe('ROLLBACK_REVIEW_CANDIDATE');
    expect(result.action).toBe('PROPOSE_ROLLBACK_REVIEW');
    expect(result.reasons.join(' ')).toContain('no rollback is executed automatically');
  });

  it('rejects unordered thresholds', () => {
    expect(() => assessPostReleaseObservation({ ...input(0.2), thresholds: { earlyWarning: 0.5, reviewRequired: 0.4, rollbackReview: 0.7 } }))
      .toThrow('POST_RELEASE_THRESHOLDS_MUST_BE_STRICTLY_ORDERED');
  });
});
