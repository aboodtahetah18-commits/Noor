import { describe, expect, it } from 'vitest';
import { summarizeHilalExposureRow } from '@/lib/conversations/hilal-exposure-profile';

const restructuring = {
  requested_count: 2,
  approved_count: 2,
  applied_count_total: 2,
  max_applied_per_case: 2,
  cases_at_precautionary_cap: 0,
  rejected_count: 0,
  cancelled_count: 0,
  precautionary_cap: 3 as const,
  precautionary_cap_reached: false,
  ledger_status: 'AVAILABLE' as const,
  policy_reference: 'HILAL_POLICY_1.0_SECTION_14' as const,
};

describe('Hilal unified exposure profile', () => {
  it('aggregates outstanding exposure from principal, growth, and paid repayments', () => {
    const result = summarizeHilalExposureRow('cat-1', {
      total_case_count: 3,
      active_case_count: 1,
      recovery_case_count: 1,
      closed_case_count: 1,
      total_approved_amount: '9000',
      total_used_principal: '7000',
      total_growth_contribution: '500',
      total_paid_repayments: '2500',
      planned_repayment_total: '5000',
      overdue_planned_amount: '1000',
      overdue_installment_count: 2,
      next_installment_number: 3,
    }, restructuring);

    expect(result).toMatchObject({
      category_id: 'cat-1',
      total_case_count: 3,
      outstanding_exposure: 5000,
      planned_repayment_total: 5000,
      overdue_planned_amount: 1000,
      overdue_installment_count: 2,
      next_installment_number: 3,
      financing_history_available: true,
      restructuring: { applied_count_total: 2, max_applied_per_case: 2, precautionary_cap: 3, precautionary_cap_reached: false },
    });
  });

  it('never returns a negative outstanding exposure', () => {
    const result = summarizeHilalExposureRow('cat-2', {
      total_case_count: 1,
      total_used_principal: 1000,
      total_growth_contribution: 0,
      total_paid_repayments: 1500,
    }, restructuring);
    expect(result.outstanding_exposure).toBe(0);
  });

  it('marks financing history unavailable when no cases exist', () => {
    const result = summarizeHilalExposureRow('cat-3', {}, restructuring);
    expect(result.financing_history_available).toBe(false);
    expect(result.next_installment_number).toBeNull();
  });
});
