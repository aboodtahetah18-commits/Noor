import { describe, expect, it } from 'vitest';
import { routeBankLearning, type BankLearningEvidence } from './bank-learning-routing';

const versions = {
  policyVersion: 'P-3',
  algorithmVersion: 'A-7',
  modelVersion: 'M-4',
  parameterVersion: 'RISK-11',
};

function evidence(overrides: Partial<BankLearningEvidence> = {}): BankLearningEvidence {
  return {
    bankKey: 'BANK_SOLVENCY',
    caseId: 'CASE-100',
    decisionId: 'DEC-100',
    learningReviewCompleted: true,
    cause: 'MODEL_CALIBRATION_ERROR',
    sampleCount: 12,
    evidenceConfidence: 0.9,
    expectedValue: 0.4,
    actualValue: 0.45,
    versions,
    ...overrides,
  };
}

const envelope = { parameter: 'riskWeight', currentValue: 0.4, min: 0.2, max: 0.8, maxStep: 0.05 };

describe('bank learning routing', () => {
  it('keeps a single-bank calibration candidate bank-local by default', () => {
    const result = routeBankLearning(evidence(), envelope);
    expect(result.scope).toBe('BANK_LOCAL');
    expect(result.centralTransferBlocked).toBe(true);
    expect(result.decision.action).toBe('BOUNDED_CALIBRATION_CANDIDATE');
  });

  it('does not allow central transfer with fewer than three distinct bank domains', () => {
    const result = routeBankLearning(evidence({ centralTransferEligible: true, distinctBankCount: 2 }), envelope);
    expect(result.scope).toBe('BANK_LOCAL');
    expect(result.centralTransferBlocked).toBe(true);
  });

  it('allows only a central shared candidate after explicit eligibility and cross-bank evidence', () => {
    const result = routeBankLearning(evidence({ centralTransferEligible: true, distinctBankCount: 3 }), envelope);
    expect(result.scope).toBe('CENTRAL_SHARED_CANDIDATE');
    expect(result.centralTransferBlocked).toBe(false);
    expect(result.reasons.join(' ')).toContain('independent central backtest');
  });

  it('never generalizes user behavior evidence across banks', () => {
    const result = routeBankLearning(evidence({
      cause: 'USER_BEHAVIOR_VARIANCE',
      centralTransferEligible: true,
      distinctBankCount: 10,
    }), envelope);
    expect(result.scope).toBe('USER_ONLY');
    expect(result.centralTransferBlocked).toBe(true);
  });

  it('routes data errors out of learning entirely', () => {
    const result = routeBankLearning(evidence({ cause: 'DATA_ERROR' }), envelope);
    expect(result.scope).toBe('EXCLUDED');
    expect(result.centralTransferBlocked).toBe(true);
  });

  it('routes algorithm gaps into governance proposals instead of calibration', () => {
    const result = routeBankLearning(evidence({ cause: 'ALGORITHM_GAP' }), envelope);
    expect(result.scope).toBe('GOVERNANCE_PROPOSAL');
    expect(result.centralTransferBlocked).toBe(true);
  });

  it('requires a stable bank key', () => {
    expect(() => routeBankLearning(evidence({ bankKey: '   ' }), envelope))
      .toThrow('BANK_LEARNING_BANK_KEY_REQUIRED');
  });
});
