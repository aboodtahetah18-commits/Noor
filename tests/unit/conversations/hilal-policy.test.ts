import { describe, expect, it } from 'vitest';
import { classifyHilalEligibilityScore, computeHilalFinanceLimit, evaluateHilalEligibility } from '@/lib/conversations/hilal-policy';

describe('Hilal approved financing policy', () => {
  it('applies the approved factor weights', () => {
    const result = evaluateHilalEligibility({
      repayment_source_clarity: 100,
      surplus_after_essentials: 80,
      income_stability: 70,
      current_obligation_burden: 60,
      funded_item_importance: 90,
    });
    expect(result.weighted_score).toBe(82);
    expect(result.band).toBe('ELIGIBLE_WITH_CONDITIONS');
  });

  it('uses the approved eligibility bands exactly', () => {
    expect(classifyHilalEligibilityScore(85).band).toBe('ELIGIBLE_WITHIN_LIMIT');
    expect(classifyHilalEligibilityScore(70).band).toBe('ELIGIBLE_WITH_CONDITIONS');
    expect(classifyHilalEligibilityScore(50).band).toBe('RESTRICTED');
    expect(classifyHilalEligibilityScore(49.99).band).toBe('REJECTED');
  });

  it('does not invent a finance limit when a policy component is missing', () => {
    expect(computeHilalFinanceLimit({ cashflowSafeLimit: 5000 })).toMatchObject({
      finance_limit: null,
      limit_complete: false,
      missing_limit_components: ['REPAYMENT_CAPACITY', 'POLICY_CAP'],
    });
  });

  it('uses the minimum only when all three policy limit components exist', () => {
    expect(computeHilalFinanceLimit({
      repaymentCapacity: 7000,
      policyCap: 6000,
      cashflowSafeLimit: 5000,
    })).toMatchObject({
      finance_limit: 5000,
      limit_complete: true,
      missing_limit_components: [],
    });
  });
});
