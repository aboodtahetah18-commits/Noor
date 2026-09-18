import type { HilalEligibilityFactor, HilalEligibilityScores } from './hilal-policy';
import type { HilalFactorEvaluation } from './hilal-factor-evaluator';

export type NumericBand = {
  min_inclusive?: number;
  max_exclusive?: number;
  score: number;
};

export type CategoryScoreMap = Record<string, number>;

export type HilalFactorCalibration =
  | { kind: 'numeric_bands'; bands: NumericBand[] }
  | { kind: 'category_map'; scores: CategoryScoreMap };

export type HilalCalibrationStatus = 'DRAFT' | 'APPROVED';

export type HilalEligibilityCalibration = {
  calibration_id: string;
  policy_version: string;
  status: HilalCalibrationStatus;
  effective_from: string | null;
  approved_reference: string | null;
  factors: Partial<Record<HilalEligibilityFactor, HilalFactorCalibration>>;
};

export type HilalCalibrationResult =
  | {
      status: 'SCORED';
      calibration_id: string;
      scores: HilalEligibilityScores;
    }
  | {
      status: 'CALIBRATION_NOT_ACTIVE' | 'CALIBRATION_INCOMPLETE' | 'EVIDENCE_INCOMPLETE' | 'VALUE_UNMAPPED';
      calibration_id: string | null;
      missing_factors: HilalEligibilityFactor[];
    };

/**
 * The current project registry explicitly marks Hilal scoring indicators as
 * structurally approved but still requiring numeric calibration before they
 * become governing. Keep this null until an approved, versioned mapping exists.
 */
export const ACTIVE_HILAL_ELIGIBILITY_CALIBRATION: HilalEligibilityCalibration | null = null;

export const HILAL_REPAYMENT_SAVINGS_SHARE = {
  parameter_id: 'SET-HL-005',
  version: 'registry-2026-09-17',
  min: 0.25,
  max: 0.50,
  status: 'APPROVED' as const,
};

function scoreNumeric(value: number, calibration: Extract<HilalFactorCalibration, { kind: 'numeric_bands' }>) {
  const band = calibration.bands.find((item) => {
    const meetsMin = item.min_inclusive === undefined || value >= item.min_inclusive;
    const meetsMax = item.max_exclusive === undefined || value < item.max_exclusive;
    return meetsMin && meetsMax;
  });
  return band?.score ?? null;
}

function scoreCategory(value: string, calibration: Extract<HilalFactorCalibration, { kind: 'category_map' }>) {
  const score = calibration.scores[value];
  return typeof score === 'number' ? score : null;
}

export function scoreHilalFactorEvidence(
  evidence: HilalFactorEvaluation,
  calibration: HilalEligibilityCalibration | null = ACTIVE_HILAL_ELIGIBILITY_CALIBRATION,
): HilalCalibrationResult {
  if (!calibration || calibration.status !== 'APPROVED') {
    return {
      status: 'CALIBRATION_NOT_ACTIVE',
      calibration_id: calibration?.calibration_id ?? null,
      missing_factors: evidence.calibration_required_factors,
    };
  }

  if (!evidence.raw_evidence_complete) {
    return {
      status: 'EVIDENCE_INCOMPLETE',
      calibration_id: calibration.calibration_id,
      missing_factors: evidence.missing_evidence_factors,
    };
  }

  const required = Object.keys(evidence.factors) as HilalEligibilityFactor[];
  const missingMappings = required.filter((factor) => !calibration.factors[factor]);
  if (missingMappings.length) {
    return {
      status: 'CALIBRATION_INCOMPLETE',
      calibration_id: calibration.calibration_id,
      missing_factors: missingMappings,
    };
  }

  const scores = {} as HilalEligibilityScores;
  const unmapped: HilalEligibilityFactor[] = [];

  for (const factor of required) {
    const item = evidence.factors[factor];
    const mapping = calibration.factors[factor];
    if (!mapping || item.raw_value === null) {
      unmapped.push(factor);
      continue;
    }

    let score: number | null = null;
    if (mapping.kind === 'numeric_bands' && typeof item.raw_value === 'number') {
      score = scoreNumeric(item.raw_value, mapping);
    } else if (mapping.kind === 'category_map' && typeof item.raw_value === 'string') {
      score = scoreCategory(item.raw_value, mapping);
    }

    if (score === null || !Number.isFinite(score) || score < 0 || score > 100) {
      unmapped.push(factor);
      continue;
    }
    scores[factor] = score;
  }

  if (unmapped.length) {
    return {
      status: 'VALUE_UNMAPPED',
      calibration_id: calibration.calibration_id,
      missing_factors: unmapped,
    };
  }

  return {
    status: 'SCORED',
    calibration_id: calibration.calibration_id,
    scores,
  };
}

export function computeApprovedRepaymentInstallmentBand(monthlyNetIncome: number, recurringCoreObligations: number) {
  const safeSavings = Math.max(monthlyNetIncome - recurringCoreObligations, 0);
  return {
    parameter_id: HILAL_REPAYMENT_SAVINGS_SHARE.parameter_id,
    parameter_version: HILAL_REPAYMENT_SAVINGS_SHARE.version,
    safe_savings: safeSavings,
    min_installment_from_safe_savings: safeSavings * HILAL_REPAYMENT_SAVINGS_SHARE.min,
    max_installment_from_safe_savings: safeSavings * HILAL_REPAYMENT_SAVINGS_SHARE.max,
    min_share: HILAL_REPAYMENT_SAVINGS_SHARE.min,
    max_share: HILAL_REPAYMENT_SAVINGS_SHARE.max,
  };
}
