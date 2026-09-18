import { describe, expect, it } from 'vitest';
import { evaluateHilalPolicyCapGovernance } from '@/lib/conversations/hilal-policy-cap-governance';
import type { HilalExposureProfile } from '@/lib/conversations/hilal-exposure-profile';

function exposure(overrides: Partial<HilalExposureProfile> = {}): HilalExposureProfile {
  return {
    category_id: 'cat-1',
    total_case_count: 2,
    active_case_count: 1,
    recovery_case_count: 1,
    closed_case_count: 0,
    total_approved_amount: 8000,
    total_used_principal: 6000,
    total_growth_contribution: 400,
    total_paid_repayments: 2400,
    outstanding_exposure: 4000,
    planned_repayment_total: 4000,
    overdue_planned_amount: 0,
    overdue_installment_count: 0,
    next_installment_number: 2,
    financing_history_available: true,
    restructuring: {
      requested_count: 1,
      approved_count: 1,
      applied_count_total: 1,
      max_applied_per_case: 1,
      cases_at_precautionary_cap: 0,
      rejected_count: 0,
      cancelled_count: 0,
      precautionary_cap: 3,
      precautionary_cap_reached: false,
      ledger_status: 'AVAILABLE',
      policy_reference: 'HILAL_POLICY_1.0_SECTION_14',
    },
    source: 'INTERNAL_FUNDING_LEDGER',
    ...overrides,
  };
}

describe('Hilal policy cap governance', () => {
  it('stops new financing when any repayment is overdue', () => {
    const result = evaluateHilalPolicyCapGovernance({
      plannedAmount: 3000,
      actualSpend: 2500,
      historicalAverageSpend: 2200,
      realizedIncome: 10000,
      isEssential: false,
      expenseNatureDefault: 'OPTIONAL',
      exposure: exposure({ overdue_installment_count: 1, overdue_planned_amount: 700 }),
    });
    expect(result).toMatchObject({
      policy_cap: 0,
      status: 'HARD_STOP_OVERDUE',
      hard_stop: true,
      hard_stop_reason: 'OVERDUE_REPAYMENT',
    });
  });

  it('computes raw policy-cap signals without inventing a numeric cap', () => {
    const result = evaluateHilalPolicyCapGovernance({
      plannedAmount: 4000,
      actualSpend: 3000,
      historicalAverageSpend: 2000,
      realizedIncome: 10000,
      isEssential: true,
      expenseNatureDefault: 'NECESSARY',
      exposure: exposure(),
    });
    expect(result.status).toBe('NUMERIC_CALIBRATION_REQUIRED');
    expect(result.policy_cap).toBeNull();
    expect(result.signals).toMatchObject({
      category_utilization_ratio: 0.75,
      current_vs_historical_spend_ratio: 1.5,
      outstanding_exposure: 4000,
      exposure_to_realized_income_ratio: 0.4,
      financing_frequency: 2,
      active_or_recovery_case_count: 2,
      overdue_installment_count: 0,
      restructuring_applied_count_total: 1,
      restructuring_max_applied_per_case: 1,
      restructuring_precautionary_cap_reached: false,
      essential_category: true,
    });
  });

  it('does not divide by zero when income or plan baseline is unavailable', () => {
    const result = evaluateHilalPolicyCapGovernance({
      plannedAmount: 0,
      actualSpend: 500,
      historicalAverageSpend: 0,
      realizedIncome: 0,
      isEssential: null,
      expenseNatureDefault: null,
      exposure: exposure(),
    });
    expect(result.signals.category_utilization_ratio).toBeNull();
    expect(result.signals.current_vs_historical_spend_ratio).toBeNull();
    expect(result.signals.exposure_to_realized_income_ratio).toBeNull();
  });
});
