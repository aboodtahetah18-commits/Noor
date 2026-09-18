import { describe, expect, it } from 'vitest';
import { buildHilalRestructuringProposal } from '@/lib/conversations/hilal-restructuring-engine';

const fundingCase = {
  id: 'case-1',
  title: 'تمويل الوقود',
  status: 'RECOVERY',
  category_id: 'cat-1',
  category_name: 'وقود',
  remaining_amount: 6000,
  remaining_installments: 6,
  next_installment_number: 1,
  next_installment_amount: 1000,
};

describe('Hilal restructuring proposal', () => {
  it('builds a plan inside the verified monthly repayment capacity', () => {
    const result = buildHilalRestructuringProposal(fundingCase, 1500, 1200);
    expect(result).toMatchObject({
      remaining_amount: 6000,
      proposed_monthly_repayment: 1200,
      proposed_cycles: 5,
      safe_monthly_capacity: 1500,
      feasible: true,
    });
  });

  it('rejects a requested duration whose installment exceeds safe capacity', () => {
    const result = buildHilalRestructuringProposal(fundingCase, 1000, undefined, 4);
    expect(result.feasible).toBe(false);
    expect(result.proposed_monthly_repayment).toBe(1500);
  });

  it('rejects schedules beyond the canonical 36-cycle limit', () => {
    const result = buildHilalRestructuringProposal(
      { ...fundingCase, remaining_amount: 40000 },
      1000,
      1000,
    );
    expect(result.feasible).toBe(false);
    expect(result.proposed_cycles).toBe(40);
  });
});
