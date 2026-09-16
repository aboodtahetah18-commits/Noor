import { describe, expect, it } from 'vitest';
import type { GovernanceLearningSnapshot } from '@/repositories/governance-learning-repository';
import { routeGovernanceLearningSnapshot } from './process-governance-learning';

function snapshot(overrides: Partial<GovernanceLearningSnapshot> = {}): GovernanceLearningSnapshot {
  return {
    bankKey: 'SOLVENCY',
    centralTransferEligible: false,
    distinctBankCount: 1,
    lifecycle: {
      caseId: 'CASE-1',
      decisionId: 'DEC-1',
      userDecisionStatus: 'CONFIRMED',
      executionTaskStatus: 'REQUIRED',
      latestExecutionStatus: 'VERIFIED',
      pendingEvidenceCount: 0,
      matchedEvidenceCount: 1,
      monitoringStatus: 'COMPLETED',
      outcomeStatus: 'MEASURED',
      settlementStatus: 'SETTLED',
      learningReviewStatus: 'COMPLETED',
      expectedValue: 0.4,
      actualValue: 0.45,
      sampleCount: 10,
      evidenceConfidence: 0.9,
      cause: 'MODEL_CALIBRATION_ERROR',
      versions: {
        policyVersion: 'P-1',
        algorithmVersion: 'A-1',
        modelVersion: 'M-1',
        parameterVersion: 'PAR-1',
      },
    },
    ...overrides,
  };
}

const envelope = { parameter: 'riskWeight', currentValue: 0.4, min: 0.2, max: 0.8, maxStep: 0.05 };

describe('process governance learning', () => {
  it('blocks a DB snapshot when execution evidence is incomplete', () => {
    const s = snapshot({
      lifecycle: {
        ...snapshot().lifecycle,
        pendingEvidenceCount: 1,
        matchedEvidenceCount: 0,
      },
    });
    const result = routeGovernanceLearningSnapshot(s, envelope);
    expect(result.status).toBe('BLOCKED');
    expect(result.blockers).toContain('EXECUTION_NOT_VERIFIED');
  });

  it('routes an eligible DB snapshot as bank-local by default', () => {
    const result = routeGovernanceLearningSnapshot(snapshot(), envelope);
    expect(result.status).toBe('ROUTED');
    expect(result.route?.scope).toBe('BANK_LOCAL');
    expect(result.route?.bankKey).toBe('SOLVENCY');
  });

  it('does not promote centrally without server-owned transfer eligibility', () => {
    const result = routeGovernanceLearningSnapshot(snapshot({ distinctBankCount: 8 }), envelope);
    expect(result.route?.scope).toBe('BANK_LOCAL');
    expect(result.route?.centralTransferBlocked).toBe(true);
  });

  it('permits only a central candidate when DB snapshot explicitly allows transfer and 3 banks are represented', () => {
    const result = routeGovernanceLearningSnapshot(snapshot({ centralTransferEligible: true, distinctBankCount: 3 }), envelope);
    expect(result.route?.scope).toBe('CENTRAL_SHARED_CANDIDATE');
    expect(result.route?.centralTransferBlocked).toBe(false);
  });
});
