import { describe, expect, it } from 'vitest';
import { calculateHilalRepaymentCapacity } from '@/lib/conversations/hilal-repayment-capacity';

describe('Hilal repayment capacity from realized income', () => {
  it('uses the lower of realized salary and confirmed monthly income', () => {
    const result = calculateHilalRepaymentCapacity({
      confirmedMonthlyIncome: 10000,
      recurringCoreObligations: 4000,
      realizedSalaryIncome: 12000,
      repaymentCycles: 12,
    });
    expect(result).toMatchObject({
      conservative_income_basis: 10000,
      safe_savings: 6000,
      max_monthly_repayment: 3000,
      repayment_cycles: 12,
      repayment_capacity: 36000,
      methodology: 'MIN_REALIZED_AND_CONFIRMED_INCOME',
    });
  });

  it('does not use expected income when no salary is realized', () => {
    const result = calculateHilalRepaymentCapacity({
      confirmedMonthlyIncome: 10000,
      recurringCoreObligations: 4000,
      realizedSalaryIncome: 0,
      repaymentCycles: 12,
    });
    expect(result.source_status).toBe('NO_REALIZED_SALARY');
    expect(result.repayment_capacity).toBe(0);
    expect(result.max_monthly_repayment).toBe(0);
  });

  it('keeps principal capacity unresolved until repayment duration exists', () => {
    const result = calculateHilalRepaymentCapacity({
      confirmedMonthlyIncome: 9000,
      recurringCoreObligations: 5000,
      realizedSalaryIncome: 9000,
    });
    expect(result.max_monthly_repayment).toBe(2000);
    expect(result.repayment_capacity).toBeNull();
  });
});
