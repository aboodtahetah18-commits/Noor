import { describe, expect, it } from 'vitest';
import { evaluateHilalFactorEvidence } from '@/lib/conversations/hilal-factor-evaluator';

describe('Hilal eligibility factor evidence', () => {
  it('derives raw surplus and obligation burden from confirmed baseline values', () => {
    const result = evaluateHilalFactorEvidence({
      monthlyNetIncome: 10000,
      recurringCoreObligations: 4000,
    });
    expect(result.factors.surplus_after_essentials).toMatchObject({
      status: 'READY_RAW',
      raw_value: 6000,
    });
    expect(result.factors.current_obligation_burden).toMatchObject({
      status: 'READY_RAW',
      raw_value: 0.4,
    });
  });

  it('does not treat an unverified repayment source as confirmed evidence', () => {
    const result = evaluateHilalFactorEvidence({
      repaymentSource: 'راتب الشهر القادم',
      repaymentSourceVerified: false,
    });
    expect(result.factors.repayment_source_clarity.status).toBe('NEEDS_EVIDENCE');
    expect(result.factors.repayment_source_clarity.evidence_source).toBe('user_declared_unverified');
  });

  it('collects user-confirmed raw classifications without inventing 0-100 scores', () => {
    const result = evaluateHilalFactorEvidence({
      monthlyNetIncome: 12000,
      recurringCoreObligations: 5000,
      repaymentSource: 'راتب محقق',
      repaymentSourceVerified: true,
      incomePattern: 'STABLE',
      fundedItemImportance: 'ESSENTIAL',
    });
    expect(result.raw_evidence_complete).toBe(true);
    expect(result.calibration_required_factors).toHaveLength(5);
    expect(result.factors.income_stability.raw_value).toBe('STABLE');
    expect(result.factors.funded_item_importance.raw_value).toBe('ESSENTIAL');
  });
});
