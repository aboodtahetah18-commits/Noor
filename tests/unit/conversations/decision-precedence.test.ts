import { describe, expect, it } from 'vitest';
import { evaluateCrossBankDecisionPrecedence } from '@/lib/conversations/decision-precedence';

describe('cross-bank hard-guard precedence', () => {
  it('prevents central, advisor, and council decisions from overriding solvency protection', () => {
    for (const source of ['CENTRAL', 'ADVISOR', 'COUNCIL'] as const) {
      const result = evaluateCrossBankDecisionPrecedence({
        source,
        action: 'INVESTMENT',
        hardGuards: ['SOLVENCY_PROTECTED_FLOOR'],
      });
      expect(result).toMatchObject({
        blocked: true,
        precedence: 'HARD_GUARD_FIRST',
        source_can_override: false,
      });
    }
  });

  it('prevents any financing recommendation from overriding Hilal hard guards', () => {
    const guards = [
      'HILAL_OVERDUE_REPAYMENT',
      'HILAL_ELIGIBILITY_REJECTED',
      'HILAL_FINANCE_LIMIT',
    ] as const;

    for (const guard of guards) {
      const result = evaluateCrossBankDecisionPrecedence({
        source: 'COUNCIL',
        action: 'FINANCING',
        hardGuards: [guard],
      });
      expect(result.blocked).toBe(true);
      expect(result.applicable_hard_guards).toContain(guard);
      expect(result.source_can_override).toBe(false);
    }
  });

  it('does not let Hilal-specific guards block unrelated general analysis', () => {
    const result = evaluateCrossBankDecisionPrecedence({
      source: 'ADVISOR',
      action: 'GENERAL',
      hardGuards: ['HILAL_OVERDUE_REPAYMENT'],
    });
    expect(result).toMatchObject({
      blocked: false,
      precedence: 'ADVISORY_REVIEW_ALLOWED',
      source_can_override: false,
    });
  });

  it('keeps solvency protection relevant to both investment and financing', () => {
    for (const action of ['INVESTMENT', 'FINANCING'] as const) {
      const result = evaluateCrossBankDecisionPrecedence({
        source: 'CENTRAL',
        action,
        hardGuards: ['SOLVENCY_PROTECTED_FLOOR'],
      });
      expect(result.blocked).toBe(true);
    }
  });
});
