import { describe, expect, it } from 'vitest';
import { computeHilalFinanceLimit, evaluateHilalFinancingGate } from '@/lib/conversations/hilal-policy';
import { evaluateHilalPolicyCapGovernance } from '@/lib/conversations/hilal-policy-cap-governance';
import type { HilalExposureProfile } from '@/lib/conversations/hilal-exposure-profile';

function exposure(overrides: Partial<HilalExposureProfile> = {}): HilalExposureProfile {
  return {
    category_id: 'cat-1',
    total_case_count: 1,
    active_case_count: 1,
    recovery_case_count: 0,
    closed_case_count: 0,
    total_approved_amount: 5000,
    total_used_principal: 3000,
    total_growth_contribution: 200,
    total_paid_repayments: 1000,
    outstanding_exposure: 2000,
    planned_repayment_total: 2000,
    overdue_planned_amount: 0,
    overdue_installment_count: 0,
    next_installment_number: 2,
    financing_history_available: true,
    restructuring: {
      requested_count: 0,
      approved_count: 0,
      applied_count_total: 0,
      max_applied_per_case: 0,
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

function governance(overrides: Partial<HilalExposureProfile> = {}) {
  return evaluateHilalPolicyCapGovernance({
    plannedAmount: 4000,
    actualSpend: 2000,
    historicalAverageSpend: 1800,
    realizedIncome: 10000,
    isEssential: true,
    expenseNatureDefault: 'NECESSARY',
    exposure: exposure(overrides),
  });
}

describe('Hilal integrated financing gate', () => {
  it('allows review when all governed limits pass', () => {
    const limit = computeHilalFinanceLimit({
      repaymentCapacity: 12000,
      policyCap: 4200,
      cashflowSafeLimit: 9000,
    });
    const gate = evaluateHilalFinancingGate({
      requestedAmount: 4000,
      safeCapacity: 9000,
      commitmentGap: 0,
      financeLimit: limit.finance_limit,
      installment: 1500,
      maxApprovedInstallment: 3000,
      policyHardStop: false,
      eligibilityBand: 'ELIGIBLE_WITHIN_LIMIT',
    });
    expect(limit.finance_limit).toBe(4200);
    expect(gate.blocked).toBe(false);
  });

  it('blocks a governed rejected eligibility result', () => {
    const gate = evaluateHilalFinancingGate({
      requestedAmount: 1000,
      safeCapacity: 9000,
      commitmentGap: 0,
      financeLimit: 5000,
      installment: 500,
      maxApprovedInstallment: 3000,
      policyHardStop: false,
      eligibilityBand: 'REJECTED',
    });
    expect(gate).toMatchObject({
      blocked: true,
      block_reasons: ['ELIGIBILITY_REJECTED'],
    });
  });

  it('turns overdue recovery into a zero limit and hard stop', () => {
    const result = governance({
      overdue_installment_count: 1,
      overdue_planned_amount: 700,
      recovery_case_count: 1,
      active_case_count: 0,
    });
    const limit = computeHilalFinanceLimit({
      repaymentCapacity: 12000,
      policyCap: result.hard_stop ? 0 : 4200,
      cashflowSafeLimit: 9000,
    });
    const gate = evaluateHilalFinancingGate({
      requestedAmount: 1000,
      safeCapacity: 9000,
      commitmentGap: 0,
      financeLimit: limit.finance_limit,
      installment: 500,
      maxApprovedInstallment: 3000,
      policyHardStop: result.hard_stop,
      eligibilityBand: 'ELIGIBLE_WITHIN_LIMIT',
    });
    expect(limit.finance_limit).toBe(0);
    expect(gate.blocked).toBe(true);
    expect(gate.block_reasons).toEqual(expect.arrayContaining([
      'FINANCE_LIMIT_EXCEEDED',
      'OVERDUE_REPAYMENT_HARD_STOP',
    ]));
  });

  it('keeps conditional and restricted eligibility in human review instead of hard rejecting them', () => {
    for (const band of ['ELIGIBLE_WITH_CONDITIONS', 'RESTRICTED'] as const) {
      const gate = evaluateHilalFinancingGate({
        requestedAmount: 1000,
        safeCapacity: 9000,
        commitmentGap: 0,
        financeLimit: 5000,
        installment: 500,
        maxApprovedInstallment: 3000,
        policyHardStop: false,
        eligibilityBand: band,
      });
      expect(gate.blocked).toBe(false);
      expect(gate.eligibility_requires_conditions).toBe(true);
    }
  });
});
