import { describe, expect, it } from 'vitest';
import { evaluateHilalFactorEvidence } from '@/lib/conversations/hilal-factor-evaluator';
import { scoreHilalFactorEvidence, type HilalEligibilityCalibration } from '@/lib/conversations/hilal-calibration';
import { evaluateHilalEligibility, computeHilalFinanceLimit, evaluateHilalFinancingGate } from '@/lib/conversations/hilal-policy';
import { evaluateHilalPolicyCapGovernance } from '@/lib/conversations/hilal-policy-cap-governance';
import { evaluateHilalPolicyCapCalibration, type HilalPolicyCapCalibration } from '@/lib/conversations/hilal-policy-cap-calibration';

const eligibilityCalibration: HilalEligibilityCalibration = {
  calibration_id: 'eligibility-integration-v1',
  policy_version: '1.0-test',
  status: 'APPROVED_GOVERNING',
  historical_validation_reference: 'BACKTEST-ELIG-001',
  approved_reference: 'GOV-ELIG-001',
  effective_from: '2026-09-18',
  factors: {
    repayment_source_clarity: { kind: 'category_map', scores: { SALARY_VERIFIED: 95 } },
    surplus_after_essentials: { kind: 'numeric_bands', bands: [{ min_inclusive: 0, score: 90 }] },
    income_stability: { kind: 'category_map', scores: { STABLE: 95 } },
    current_obligation_burden: { kind: 'numeric_bands', bands: [{ min_inclusive: 0, score: 90 }] },
    funded_item_importance: { kind: 'category_map', scores: { ESSENTIAL: 100 } },
  },
};

const capCalibration: HilalPolicyCapCalibration = {
  calibration_id: 'cap-integration-v1',
  policy_version: '1.0-test',
  status: 'APPROVED_GOVERNING',
  historical_validation_reference: 'BACKTEST-CAP-001',
  approved_reference: 'GOV-CAP-001',
  effective_from: '2026-09-18',
  compute_policy_cap: () => 4200,
};

describe('Hilal governed decision integration', () => {
  it('produces a reviewable request only when both numeric calibrations are governing and every hard gate passes', () => {
    const evidence = evaluateHilalFactorEvidence({
      monthlyNetIncome: 10000,
      recurringCoreObligations: 4000,
      repaymentSource: 'SALARY_VERIFIED',
      repaymentSourceVerified: true,
      incomePattern: 'STABLE',
      fundedItemImportance: 'ESSENTIAL',
    });
    const scored = scoreHilalFactorEvidence(evidence, eligibilityCalibration);
    expect(scored.status).toBe('SCORED');
    if (scored.status !== 'SCORED') throw new Error('eligibility scoring must be governing');

    const eligibility = evaluateHilalEligibility(scored.scores);
    expect(eligibility.band).toBe('ELIGIBLE_WITHIN_LIMIT');

    const governance = evaluateHilalPolicyCapGovernance({
      plannedAmount: 4000,
      actualSpend: 2000,
      historicalAverageSpend: 1800,
      realizedIncome: 10000,
      isEssential: true,
      expenseNatureDefault: 'NECESSARY',
      exposure: null,
    });
    const cap = evaluateHilalPolicyCapCalibration({
      requested_amount: 4000,
      repayment_capacity: 12000,
      cashflow_safe_limit: 9000,
      signals: governance.signals,
      calibration: capCalibration,
    });
    expect(cap).toMatchObject({ status: 'CALIBRATED', policy_cap: 4200 });

    const limit = computeHilalFinanceLimit({
      repaymentCapacity: 12000,
      policyCap: cap.policy_cap ?? undefined,
      cashflowSafeLimit: 9000,
    });
    const gate = evaluateHilalFinancingGate({
      requestedAmount: 4000,
      safeCapacity: 9000,
      commitmentGap: 0,
      financeLimit: limit.finance_limit,
      installment: 1500,
      maxApprovedInstallment: 3000,
      policyHardStop: governance.hard_stop,
      eligibilityBand: eligibility.band,
    });

    expect(limit.finance_limit).toBe(4200);
    expect(gate.blocked).toBe(false);
    expect(gate.block_reasons).toEqual([]);
  });
});
