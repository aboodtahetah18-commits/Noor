import { describe, expect, it } from 'vitest';
import { processDecisionOutcomeLearning, type ProcessDecisionOutcomeLearningInput } from './process-decision-outcome-learning';

const versions = { policyVersion: 'P-1', algorithmVersion: 'A-1', modelVersion: 'M-1', parameterVersion: 'R-1' };
const envelope = { parameter: 'riskWeight', currentValue: 0.5, min: 0.2, max: 0.8, maxStep: 0.05 };

function input(overrides: Partial<ProcessDecisionOutcomeLearningInput> = {}): ProcessDecisionOutcomeLearningInput {
  return {
    caseId: 'CASE-10',
    decisionId: 'DEC-10',
    bankKey: 'MALAA',
    userDecisionStatus: 'CONFIRMED',
    executionTaskStatus: 'REQUIRED',
    latestExecutionStatus: 'VERIFIED',
    pendingEvidenceCount: 0,
    matchedEvidenceCount: 1,
    monitoringStatus: 'COMPLETE',
    outcomeStatus: 'MEASURED',
    settlementStatus: 'SETTLED',
    learningReviewStatus: 'COMPLETED',
    expectedValue: 0.4,
    actualValue: 0.46,
    sampleCount: 12,
    evidenceConfidence: 0.92,
    cause: 'MODEL_CALIBRATION_ERROR',
    versions,
    envelope,
    ...overrides,
  };
}

describe('process decision outcome learning', () => {
  it('does not route an outcome before verified execution', () => {
    const result = processDecisionOutcomeLearning(input({ latestExecutionStatus: 'PENDING', matchedEvidenceCount: 0 }));
    expect(result.status).toBe('BLOCKED');
    expect(result.route).toBeNull();
  });

  it('routes a completed single-bank outcome as bank-local by default', () => {
    const result = processDecisionOutcomeLearning(input());
    expect(result.status).toBe('ROUTED');
    if (result.status === 'ROUTED') expect(result.route.scope).toBe('BANK_LOCAL');
  });

  it('never centralizes user-behavior learning', () => {
    const result = processDecisionOutcomeLearning(input({ cause: 'USER_BEHAVIOR_VARIANCE', centralTransferEligible: true, distinctBankCount: 5 }));
    expect(result.status).toBe('ROUTED');
    if (result.status === 'ROUTED') expect(result.route.scope).toBe('USER_ONLY');
  });

  it('permits only a central candidate after comparable evidence from at least three banks', () => {
    const result = processDecisionOutcomeLearning(input({ centralTransferEligible: true, distinctBankCount: 3 }));
    expect(result.status).toBe('ROUTED');
    if (result.status === 'ROUTED') expect(result.route.scope).toBe('CENTRAL_SHARED_CANDIDATE');
  });

  it('routes policy gaps into governance rather than calibration', () => {
    const result = processDecisionOutcomeLearning(input({ cause: 'POLICY_GAP' }));
    expect(result.status).toBe('ROUTED');
    if (result.status === 'ROUTED') expect(result.route.scope).toBe('GOVERNANCE_PROPOSAL');
  });
});
