import { describe, it, expect } from 'vitest';
import { classifyDataRequest, fieldsForStage, missingRequiredFields } from '@/features/financial-data-lifecycle/field-rules';

describe('progressive financial data collection', () => {
  it('asks only core fields during foundation', () => {
    const initial = fieldsForStage('FOUNDATION');
    expect(initial.map(r => r.field)).toContain('monthlyIncome');
    expect(initial.map(r => r.field)).not.toContain('investmentAmount');
    expect(initial.map(r => r.field)).not.toContain('loanAmount');
  });
  it('requests investment-specific facts only within investment operation', () => {
    const investment = fieldsForStage('OPERATION', 'INVESTMENT');
    expect(investment.map(r => r.field)).toContain('riskTolerance');
    expect(investment.map(r => r.field)).not.toContain('loanAmount');
    expect(classifyDataRequest('investmentHorizon').stage).toBe('OPERATION');
  });
  it('honors zero monetary amounts as filled data rather than missing', () => {
    expect(missingRequiredFields('OPERATION', {
      expenseAmount: 0, expenseCategory: 'FOOD',
    }, 'EXPENSE')).toEqual([]);
  });
  it('reports missing required data but not optional setup fields', () => {
    expect(missingRequiredFields('FOUNDATION', {
      displayName: 'مالك', monthlyIncome: 5000, incomeFrequency: 'MONTHLY',
    })).toEqual(['primaryOperatingAccount']);
  });
  it('rejects an operation stage with no operation type', () => {
    expect(() => fieldsForStage('OPERATION')).toThrow('OPERATION_REQUIRED');
  });
});
