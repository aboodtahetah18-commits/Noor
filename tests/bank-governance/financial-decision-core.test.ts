import { describe, it, expect } from 'vitest';
import {
  approveDecision, availableToLend, canExecute, consolidatedPosition,
  detectClassificationPatterns, proposeDecision, rejectDecision, defaultBankPolicies,
} from '@/features/bank-governance/financial-decision-core';

describe('bank financial governance', () => {
  it('learns consistent classifications without AI calls', () => {
    const examples = [1, 2, 3, 4].map(() => ({
      bank: 'HILAL' as const, merchantKey: 'Market', category: 'GROCERIES',
      action: 'CLASSIFY' as const, outcome: 'accepted',
    }));
    expect(detectClassificationPatterns(examples)[0]).toMatchObject({
      bank: 'HILAL', category: 'GROCERIES', observations: 4, matches: 4, consistency: 1,
    });
    expect(detectClassificationPatterns(examples.slice(0, 2))).toHaveLength(0);
  });
  it('requires owner approval for loans', () => {
    const request = proposeDecision({ id: 'loan-1', bank: 'HILAL', kind: 'LOAN', amountHalalas: 300000, reason: 'السيولة' });
    expect(canExecute(request, defaultBankPolicies.HILAL)).toBe(false);
    expect(canExecute(approveDecision(request, 'owner'), defaultBankPolicies.HILAL)).toBe(true);
    expect(canExecute(approveDecision(request, 'owner'), defaultBankPolicies.MALATH)).toBe(false);
    expect(canExecute(rejectDecision(request), defaultBankPolicies.HILAL)).toBe(false);
  });
  it('protects bank minimum reserve', () => {
    expect(availableToLend(500000, { ...defaultBankPolicies.MALATH, protectedMinimumHalalas: 450000 })).toBe(50000);
  });
  it('removes internal loan double counting from consolidated position', () => {
    expect(consolidatedPosition([
      { bank: 'HILAL', cashHalalas: 300000, externalLiabilitiesHalalas: 100000, internalReceivablesHalalas: 0, internalPayablesHalalas: 200000 },
      { bank: 'MALATH', cashHalalas: 400000, externalLiabilitiesHalalas: 0, internalReceivablesHalalas: 200000, internalPayablesHalalas: 0 },
    ])).toEqual({ cashHalalas: 700000, externalLiabilitiesHalalas: 100000, netLiquidPositionHalalas: 600000 });
  });
  it('refuses inconsistent internal ledger balances', () => {
    expect(() => consolidatedPosition([
      { bank: 'HILAL', cashHalalas: 100, externalLiabilitiesHalalas: 0, internalReceivablesHalalas: 0, internalPayablesHalalas: 10 },
    ])).toThrow('UNBALANCED_INTERNAL_LEDGER');
  });
});
