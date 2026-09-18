import { describe, expect, it } from 'vitest';
import {
  computeApprovedRepaymentInstallmentBand,
  scoreHilalFactorEvidence,
  type HilalEligibilityCalibration,
} from '@/lib/conversations/hilal-calibration';
import { evaluateHilalFactorEvidence } from '@/lib/conversations/hilal-factor-evaluator';

describe('Hilal versioned calibration gate', () => {
  it('keeps automatic scoring inactive until an approved calibration exists', () => {
    const evidence = evaluateHilalFactorEvidence({
      monthlyNetIncome: 10000,
      recurringCoreObligations: 4000,
      repaymentSource: 'راتب محقق',
      repaymentSourceVerified: true,
      incomePattern: 'STABLE',
      fundedItemImportance: 'ESSENTIAL',
    });
    expect(scoreHilalFactorEvidence(evidence)).toMatchObject({
      status: 'CALIBRATION_NOT_ACTIVE',
      calibration_id: null,
    });
  });

  it('can score all five factors once a complete approved version is supplied', () => {
    const evidence = evaluateHilalFactorEvidence({
      monthlyNetIncome: 10000,
      recurringCoreObligations: 4000,
      repaymentSource: 'SALARY_VERIFIED',
      repaymentSourceVerified: true,
      incomePattern: 'STABLE',
      fundedItemImportance: 'ESSENTIAL',
    });
    const calibration: HilalEligibilityCalibration = {
      calibration_id: 'test-v1',
      policy_version: '1.0-test',
      status: 'APPROVED',
      effective_from: '2026-01-01',
      approved_reference: 'TEST_ONLY',
      factors: {
        repayment_source_clarity: { kind: 'category_map', scores: { SALARY_VERIFIED: 100 } },
        surplus_after_essentials: { kind: 'numeric_bands', bands: [{ min_inclusive: 6000, score: 90 }] },
        income_stability: { kind: 'category_map', scores: { STABLE: 95 } },
        current_obligation_burden: { kind: 'numeric_bands', bands: [{ max_exclusive: 0.5, score: 85 }] },
        funded_item_importance: { kind: 'category_map', scores: { ESSENTIAL: 100 } },
      },
    };
    expect(scoreHilalFactorEvidence(evidence, calibration)).toMatchObject({
      status: 'SCORED',
      calibration_id: 'test-v1',
      scores: {
        repayment_source_clarity: 100,
        surplus_after_essentials: 90,
        income_stability: 95,
        current_obligation_burden: 85,
        funded_item_importance: 100,
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
