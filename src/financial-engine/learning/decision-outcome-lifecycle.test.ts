import { describe, expect, it } from 'vitest';
import { buildLearningEvidenceFromOutcome, evaluateDecisionOutcomeLifecycle, type DecisionOutcomeLifecycleInput } from './decision-outcome-lifecycle';

const versions = { policyVersion: 'P-1', algorithmVersion: 'A-1', modelVersion: 'M-1', parameterVersion: 'R-1' };

function input(overrides: Partial<DecisionOutcomeLifecycleInput> = {}): DecisionOutcomeLifecycleInput {
  return {
    caseId: 'CASE-1',
    decisionId: 'DEC-1',
    userDecisionStatus: 'CONFIRMED',
    executionTaskStatus: 'REQUIRED',
    latestExecutionStatus: 'VERIFIED',
    pendingEvidenceCount: 0,
    matchedEvidenceCount: 1,
    monitoringStatus: 'COMPLETE',
    outcomeStatus: 'MEASURED',
    settlementStatus: 'SETTLED',
    learningReviewStatus: 'COMPLETED',
    expectedValue: 10,
    actualValue: 12,
    sampleCount: 8,
    evidenceConfidence: 0.9,
    cause: 'MODEL_CALIBRATION_ERROR',
    versions,
    ...overrides,
  };
}

describe('decision outcome lifecycle', () => {
  it('allows learning only after the full lifecycle is complete', () => {
    const gate = evaluateDecisionOutcomeLifecycle(input());
    expect(gate.eligibleForLearning).toBe(true);
    expect(gate.blockers).toEqual([]);
  });

  it('blocks learning when execution proof is missing', () => {
    const gate = evaluateDecisionOutcomeLifecycle(input({ latestExecutionStatus: 'PENDING', matchedEvidenceCount: 0 }));
    expect(gate.eligibleForLearning).toBe(false);
    expect(gate.blockers).toContain('EXECUTION_NOT_VERIFIED');
  });

  it('blocks learning while monitoring is still active', () => {
    const gate = evaluateDecisionOutcomeLifecycle(input({ monitoringStatus: 'ACTIVE' }));
    expect(gate.blockers).toContain('MONITORING_NOT_COMPLETE');
  });

  it('blocks learning from partial outcomes', () => {
    const gate = evaluateDecisionOutcomeLifecycle(input({ outcomeStatus: 'PARTIAL', actualValue: 11 }));
    expect(gate.blockers).toContain('OUTCOME_NOT_MEASURED');
  });

  it('marks a case ready for review before review completion, but not eligible for learning', () => {
    const gate = evaluateDecisionOutcomeLifecycle(input({ learningReviewStatus: 'READY' }));
    expect(gate.learningReview).toBe('READY');
    expect(gate.eligibleForLearning).toBe(false);
    expect(gate.blockers).toContain('LEARNING_REVIEW_NOT_COMPLETED');
  });

  it('supports decisions that legitimately require no external execution proof', () => {
    const gate = evaluateDecisionOutcomeLifecycle(input({ executionTaskStatus: 'NOT_REQUIRED', latestExecutionStatus: null, matchedEvidenceCount: 0 }));
    expect(gate.executionProof).toBe('NOT_REQUIRED');
    expect(gate.eligibleForLearning).toBe(true);
  });

  it('requires explicit cause classification', () => {
    const gate = evaluateDecisionOutcomeLifecycle(input({ cause: undefined }));
    expect(gate.blockers).toContain('CAUSE_CLASSIFICATION_REQUIRED');
  });

  it('builds governed learning evidence only after all gates pass', () => {
    expect(buildLearningEvidenceFromOutcome(input())).toMatchObject({
      caseId: 'CASE-1',
      decisionId: 'DEC-1',
      learningReviewCompleted: true,
      cause: 'MODEL_CALIBRATION_ERROR',
    });
    expect(() => buildLearningEvidenceFromOutcome(input({ pendingEvidenceCount: 1 })))
      .toThrow('DECISION_OUTCOME_NOT_READY_FOR_LEARNING');
  });
});
