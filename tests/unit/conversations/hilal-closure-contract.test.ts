import { describe, expect, it } from 'vitest';
import { evaluateHilalFinancingGate } from '@/lib/conversations/hilal-policy';
import { scoreHilalFactorEvidence } from '@/lib/conversations/hilal-calibration';
import { evaluateHilalFactorEvidence } from '@/lib/conversations/hilal-factor-evaluator';
import { evaluateHilalPolicyCapCalibration } from '@/lib/conversations/hilal-policy-cap-calibration';

describe('Hilal bank closure contract', () => {
  it('never emits a governing eligibility score without an active governed calibration', () => {
    const evidence = evaluateHilalFactorEvidence({
      monthlyNetIncome: 10000,
      recurringCoreObligations: 4000,
      repaymentSource: 'SALARY_VERIFIED',
      repaymentSourceVerified: true,
      incomePattern: 'STABLE',
      fundedItemImportance: 'ESSENTIAL',
    });
    expect(scoreHilalFactorEvidence(evidence).status).toBe('CALIBRATION_NOT_GOVERNING');
  });

  it('never emits a governing POLICY_CAP without an active governed calibration', () => {
    const result = evaluateHilalPolicyCapCalibration({
      requested_amount: 2000,
      repayment_capacity: 12000,
      cashflow_safe_limit: 9000,
      signals: {
        category_utilization_ratio: 0.5,
        current_vs_historical_spend_ratio: 1,
        outstanding_exposure: 0,
        exposure_to_realized_income_ratio: 0,
        financing_frequency: 0,
        active_or_recovery_case_count: 0,
        overdue_installment_count: 0,
        overdue_planned_amount: 0,
        restructuring_applied_count_total: 0,
        restructuring_max_applied_per_case: 0,
        restructuring_precautionary_cap_reached: false,
        essential_category: true,
        expense_nature_default: 'NECESSARY',
      },
    });
    expect(result).toMatchObject({ status: 'CALIBRATION_NOT_GOVERNING', policy_cap: null });
  });

  it('hard-blocks overdue repayment and governed rejected eligibility', () => {
    const overdue = evaluateHilalFinancingGate({
      requestedAmount: 1000,
      safeCapacity: 9000,
      commitmentGap: 0,
      financeLimit: 5000,
      installment: 500,
      maxApprovedInstallment: 3000,
      policyHardStop: true,
      eligibilityBand: 'ELIGIBLE_WITHIN_LIMIT',
    });
    expect(overdue.block_reasons).toContain('OVERDUE_REPAYMENT_HARD_STOP');

    const rejected = evaluateHilalFinancingGate({
      requestedAmount: 1000,
      safeCapacity: 9000,
      commitmentGap: 0,
      financeLimit: 5000,
      installment: 500,
      maxApprovedInstallment: 3000,
      policyHardStop: false,
      eligibilityBand: 'REJECTED',
    });
    expect(rejected.block_reasons).toContain('ELIGIBILITY_REJECTED');
  });
});
