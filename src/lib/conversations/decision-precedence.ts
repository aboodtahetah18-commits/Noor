export type CrossBankDecisionSource =
  | 'CENTRAL'
  | 'SOLVENCY'
  | 'ASSETS'
  | 'HILAL'
  | 'ADVISOR'
  | 'COUNCIL';

export type CrossBankDecisionAction =
  | 'INVESTMENT'
  | 'FINANCING'
  | 'GENERAL';

export type CrossBankHardGuard =
  | 'SOLVENCY_PROTECTED_FLOOR'
  | 'HILAL_OVERDUE_REPAYMENT'
  | 'HILAL_ELIGIBILITY_REJECTED'
  | 'HILAL_FINANCE_LIMIT';

export type CrossBankDecisionPrecedenceInput = {
  source: CrossBankDecisionSource;
  action: CrossBankDecisionAction;
  hardGuards: CrossBankHardGuard[];
};

export function evaluateCrossBankDecisionPrecedence(input: CrossBankDecisionPrecedenceInput) {
  const relevant = input.hardGuards.filter((guard) => {
    if (guard === 'SOLVENCY_PROTECTED_FLOOR') {
      return input.action === 'INVESTMENT' || input.action === 'FINANCING';
    }
    if (
      guard === 'HILAL_OVERDUE_REPAYMENT'
      || guard === 'HILAL_ELIGIBILITY_REJECTED'
      || guard === 'HILAL_FINANCE_LIMIT'
    ) {
      return input.action === 'FINANCING';
    }
    return false;
  });

  return {
    blocked: relevant.length > 0,
    applicable_hard_guards: relevant,
    precedence: relevant.length > 0
      ? 'HARD_GUARD_FIRST' as const
      : 'ADVISORY_REVIEW_ALLOWED' as const,
    source_can_override: false,
  };
}
