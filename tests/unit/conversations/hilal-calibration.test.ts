import { describe, expect, it } from 'vitest';
import {
  computeApprovedRepaymentInstallmentBand,
  getHilalEligibilityCalibrationReadiness,
  scoreHilalFactorEvidence,
  type HilalEligibilityCalibration,
} from '@/lib/conversations/hilal-calibration';
import { evaluateHilalFactorEvidence } from '@/lib/conversations/hilal-factor-evaluator';

function completeEvidence() {
  return evaluateHilalFactorEvidence({
    monthlyNetIncome: 10000,
    recurringCoreObligations: 4000,
    repaymentSource: 'SALARY_VERIFIED',
    repaymentSourceVerified: true,
    incomePattern: 'STABLE',
    fundedItemImportance: 'ESSENTIAL',
  });
}

function completeCalibration(overrides: Partial<HilalEligibilityCalibration> = {}): HilalEligibilityCalibration {
  return {
    calibration_id: 'test-v1',
    policy_version: '1.0-test',
    status: 'APPROVED_GOVERNING',
    historical_validation_reference: 'BACKTEST-HL-001',
    effective_from: '2026-01-01',
    approved_reference: 'GOV-HL-001',
    factors: {
      repayment_source_clarity: { kind: 'category_map', scores: { SALARY_VERIFIED: 100 } },
      surplus_after_essentials: { kind: 'numeric_bands', bands: [{ min_inclusive: 6000, score: 90 }] },
      income_stability: { kind: 'category_map', scores: { STABLE: 95 } },
      current_obligation_burden: { kind: 'numeric_bands', bands: [{ max_exclusive: 0.5, score: 85 }] },
      funded_item_importance: { kind: 'category_map', scores: { ESSENTIAL: 100 } },
    },
    ...overrides,
  };
}

describe('Hilal versioned calibration gate', () => {
  it('keeps automatic scoring non-governing until an approved calibration exists', () => {
    const result = scoreHilalFactorEvidence(completeEvidence());
    expect(result).toMatchObject({
      status: 'CALIBRATION_NOT_GOVERNING',
      calibration_id: null,
    });
    expect(result.readiness.activation_blockers).toEqual(expect.arrayContaining([
      'HISTORICAL_VALIDATION_REQUIRED',
      'FINAL_GOVERNANCE_APPROVAL_REQUIRED',
      'EFFECTIVE_DATE_REQUIRED',
      'FACTOR_TO_SCORE_MAPPING_REQUIRED',
    ]));
  });

  it('validates the approved eligibility weights as a complete 100% contract', () => {
    const readiness = getHilalEligibilityCalibrationReadiness();
    expect(readiness.total_weight).toBe(1);
    expect(readiness.weights_sum_valid).toBe(true);
    expect(readiness.baseline_weights_version).toBe('hilal-eligibility-policy-1.0-2026-09-14');
  });

  it('rejects a nominal governing calibration without historical validation', () => {
    const calibration = completeCalibration({ historical_validation_reference: null });
    const result = scoreHilalFactorEvidence(completeEvidence(), calibration);
    expect(result).toMatchObject({
      status: 'CALIBRATION_GOVERNANCE_INCOMPLETE',
      calibration_id: 'test-v1',
    });
    expect(result.readiness.activation_blockers).toContain('HISTORICAL_VALIDATION_REQUIRED');
  });

  it('rejects a nominal governing calibration without final approval or effective date', () => {
    const calibration = completeCalibration({
      approved_reference: null,
      effective_from: null,
    });
    const result = scoreHilalFactorEvidence(completeEvidence(), calibration);
    expect(result.status).toBe('CALIBRATION_GOVERNANCE_INCOMPLETE');
    expect(result.readiness.activation_blockers).toEqual(expect.arrayContaining([
      'FINAL_GOVERNANCE_APPROVAL_REQUIRED',
      'EFFECTIVE_DATE_REQUIRED',
    ]));
  });

  it('can score all five factors only after the governance contract is complete', () => {
    const result = scoreHilalFactorEvidence(completeEvidence(), completeCalibration());
    expect(result).toMatchObject({
      status: 'SCORED',
      calibration_id: 'test-v1',
      scores: {
        repayment_source_clarity: 100,
        surplus_after_essentials: 90,
        income_stability: 95,
        current_obligation_burden: 85,
        funded_item_importance: 100,
      },
      readiness: {
        governing_calibration_active: true,
        activation_blockers: [],
      },
    });
  });

  it('applies approved SET-HL-005 repayment savings range', () => {
    expect(computeApprovedRepaymentInstallmentBand(10000, 4000)).toMatchObject({
      parameter_id: 'SET-HL-005',
      safe_savings: 6000,
      min_installment_from_safe_savings: 1500,
      max_installment_from_safe_savings: 3000,
      min_share: 0.25,
      max_share: 0.5,
    });
  });
});
