export const HILAL_POLICY_VERSION = '1.0-2026-09-14';

export const HILAL_ELIGIBILITY_WEIGHTS = {
  repayment_source_clarity: 0.30,
  surplus_after_essentials: 0.25,
  income_stability: 0.20,
  current_obligation_burden: 0.15,
  funded_item_importance: 0.10,
} as const;

export type HilalEligibilityFactor = keyof typeof HILAL_ELIGIBILITY_WEIGHTS;
export type HilalEligibilityBand =
  | 'ELIGIBLE_WITHIN_LIMIT'
  | 'ELIGIBLE_WITH_CONDITIONS'
  | 'RESTRICTED'
  | 'REJECTED';

export type HilalEligibilityScores = Record<HilalEligibilityFactor, number>;

export type HilalEligibilityResult = {
  policy_version: string;
  weighted_score: number;
  band: HilalEligibilityBand;
  decision_ar: string;
  factor_contributions: Record<HilalEligibilityFactor, number>;
};

function assertScore(value: number, factor: HilalEligibilityFactor) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`HILAL_ELIGIBILITY_SCORE_INVALID:${factor}`);
  }
}

export function classifyHilalEligibilityScore(score: number): Pick<HilalEligibilityResult, 'band' | 'decision_ar'> {
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error('HILAL_ELIGIBILITY_SCORE_INVALID');
  if (score >= 85) return { band: 'ELIGIBLE_WITHIN_LIMIT', decision_ar: 'مؤهل داخل السقف' };
  if (score >= 70) return { band: 'ELIGIBLE_WITH_CONDITIONS', decision_ar: 'مؤهل بشروط أو مبلغ أقل' };
  if (score >= 50) return { band: 'RESTRICTED', decision_ar: 'مقيد؛ يتطلب سببًا قويًا وسدادًا قريبًا' };
  return { band: 'REJECTED', decision_ar: 'مرفوض' };
}

export function evaluateHilalEligibility(scores: HilalEligibilityScores): HilalEligibilityResult {
  const entries = Object.entries(HILAL_ELIGIBILITY_WEIGHTS) as Array<[HilalEligibilityFactor, number]>;
  const factorContributions = {} as Record<HilalEligibilityFactor, number>;
  let weightedScore = 0;

  for (const [factor, weight] of entries) {
    const value = scores[factor];
    assertScore(value, factor);
    const contribution = value * weight;
    factorContributions[factor] = contribution;
    weightedScore += contribution;
  }

  const rounded = Math.round(weightedScore * 100) / 100;
  const classification = classifyHilalEligibilityScore(rounded);
  return {
    policy_version: HILAL_POLICY_VERSION,
    weighted_score: rounded,
    ...classification,
    factor_contributions: factorContributions,
  };
}

export function missingHilalEligibilityFactors(scores: Partial<HilalEligibilityScores> | undefined) {
  const current = scores ?? {};
  return (Object.keys(HILAL_ELIGIBILITY_WEIGHTS) as HilalEligibilityFactor[])
    .filter((factor) => typeof current[factor] !== 'number');
}

export type HilalFinanceLimitInput = {
  repaymentCapacity?: number;
  policyCap?: number;
  cashflowSafeLimit?: number;
};

export function computeHilalFinanceLimit(input: HilalFinanceLimitInput) {
  const components = {
    repayment_capacity: typeof input.repaymentCapacity === 'number' ? Math.max(input.repaymentCapacity, 0) : null,
    policy_cap: typeof input.policyCap === 'number' ? Math.max(input.policyCap, 0) : null,
    cashflow_safe_limit: typeof input.cashflowSafeLimit === 'number' ? Math.max(input.cashflowSafeLimit, 0) : null,
  };
  const known = Object.values(components).filter((value): value is number => typeof value === 'number');
  return {
    ...components,
    finance_limit: known.length === 3 ? Math.min(...known) : null,
    limit_complete: known.length === 3,
    missing_limit_components: [
      ...(components.repayment_capacity === null ? ['REPAYMENT_CAPACITY'] : []),
      ...(components.policy_cap === null ? ['POLICY_CAP'] : []),
      ...(components.cashflow_safe_limit === null ? ['CASHFLOW_SAFE_LIMIT'] : []),
    ],
  };
}


export type HilalFinancingBlockReason =
  | 'SAFE_CAPACITY_EXCEEDED'
  | 'PROTECTION_COMMITMENT_GAP'
  | 'FINANCE_LIMIT_EXCEEDED'
  | 'INSTALLMENT_ABOVE_APPROVED_BAND'
  | 'OVERDUE_REPAYMENT_HARD_STOP'
  | 'ELIGIBILITY_REJECTED';

export type HilalFinancingGateInput = {
  requestedAmount: number;
  safeCapacity: number;
  commitmentGap: number;
  financeLimit: number | null;
  installment: number;
  maxApprovedInstallment: number;
  policyHardStop: boolean;
  eligibilityBand: HilalEligibilityBand | null;
};

export function evaluateHilalFinancingGate(input: HilalFinancingGateInput) {
  const blockReasons: HilalFinancingBlockReason[] = [];

  if (input.requestedAmount > input.safeCapacity) blockReasons.push('SAFE_CAPACITY_EXCEEDED');
  if (input.commitmentGap > 0) blockReasons.push('PROTECTION_COMMITMENT_GAP');
  if (input.financeLimit !== null && input.requestedAmount > input.financeLimit) {
    blockReasons.push('FINANCE_LIMIT_EXCEEDED');
  }
  if (input.installment > input.maxApprovedInstallment) {
    blockReasons.push('INSTALLMENT_ABOVE_APPROVED_BAND');
  }
  if (input.policyHardStop) blockReasons.push('OVERDUE_REPAYMENT_HARD_STOP');
  if (input.eligibilityBand === 'REJECTED') blockReasons.push('ELIGIBILITY_REJECTED');

  return {
    blocked: blockReasons.length > 0,
    block_reasons: blockReasons,
    eligibility_requires_conditions:
      input.eligibilityBand === 'ELIGIBLE_WITH_CONDITIONS' || input.eligibilityBand === 'RESTRICTED',
  } as const;
}
