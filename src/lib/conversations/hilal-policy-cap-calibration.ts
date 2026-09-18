import type { HilalPolicyCapSignals } from './hilal-policy-cap-governance';

export const HILAL_POLICY_CAP_BASELINE_WEIGHTS = {
  free_safe_liquidity: { record_id: 'WGT-007', weight: 25, dynamic_range_pp: 5, direction: 'HIGHER_BETTER' },
  repayment_capacity: { record_id: 'WGT-008', weight: 20, dynamic_range_pp: 5, direction: 'HIGHER_BETTER' },
  delinquency_and_restructuring: { record_id: 'WGT-009', weight: 15, dynamic_range_pp: 5, direction: 'LOWER_BETTER' },
  category_exposure_concentration: { record_id: 'WGT-010', weight: 15, dynamic_range_pp: 5, direction: 'LOWER_BETTER' },
  institutional_support_dependency: { record_id: 'WGT-011', weight: 10, dynamic_range_pp: 3, direction: 'LOWER_BETTER' },
  category_volatility: { record_id: 'WGT-012', weight: 10, dynamic_range_pp: 3, direction: 'LOWER_BETTER' },
  data_quality: { record_id: 'WGT-013', weight: 5, dynamic_range_pp: 2, direction: 'HIGHER_BETTER' },
} as const;

export type HilalPolicyCapCalibrationStatus =
  | 'SIMULATION_ONLY'
  | 'APPROVED_GOVERNING';

export type HilalPolicyCapCalibration = {
  calibration_id: string;
  policy_version: string;
  status: HilalPolicyCapCalibrationStatus;
  historical_validation_reference: string | null;
  approved_reference: string | null;
  effective_from: string | null;
  compute_policy_cap: (input: {
    requested_amount: number;
    repayment_capacity: number | null;
    cashflow_safe_limit: number;
    signals: HilalPolicyCapSignals;
  }) => number;
};

/**
 * The project registry marks WGT-007..WGT-013 as structurally/sensitivity
 * checked but requiring historical validation before governing activation.
 * Therefore there is intentionally no active governing numeric calibration.
 */
export const ACTIVE_HILAL_POLICY_CAP_CALIBRATION: HilalPolicyCapCalibration | null = null;

export function getHilalPolicyCapCalibrationReadiness() {
  const totalWeight = Object.values(HILAL_POLICY_CAP_BASELINE_WEIGHTS)
    .reduce((sum, item) => sum + item.weight, 0);

  return {
    baseline_weights_version: 'hilal-wgt-007-013-registry-2026-09-18',
    total_weight: totalWeight,
    weights_sum_valid: totalWeight === 100,
    governing_calibration_active: ACTIVE_HILAL_POLICY_CAP_CALIBRATION !== null,
    activation_blockers: [
      'HISTORICAL_VALIDATION_REQUIRED',
      'FINAL_GOVERNANCE_APPROVAL_REQUIRED',
      'SIGNAL_TO_CAP_NUMERIC_MAPPING_REQUIRED',
    ],
    source_records: Object.values(HILAL_POLICY_CAP_BASELINE_WEIGHTS).map((item) => ({
      record_id: item.record_id,
      weight: item.weight,
      dynamic_range_pp: item.dynamic_range_pp,
      direction: item.direction,
      registry_status: 'STRUCTURAL_AND_SENSITIVITY_CHECK_PASSED_HISTORICAL_VALIDATION_REQUIRED',
    })),
  } as const;
}

export function evaluateHilalPolicyCapCalibration(input: {
  requested_amount: number;
  repayment_capacity: number | null;
  cashflow_safe_limit: number;
  signals: HilalPolicyCapSignals;
  calibration?: HilalPolicyCapCalibration | null;
}) {
  const calibration = input.calibration ?? ACTIVE_HILAL_POLICY_CAP_CALIBRATION;
  if (!calibration || calibration.status !== 'APPROVED_GOVERNING') {
    return {
      status: 'CALIBRATION_NOT_GOVERNING' as const,
      policy_cap: null,
      calibration_id: calibration?.calibration_id ?? null,
      readiness: getHilalPolicyCapCalibrationReadiness(),
    };
  }

  if (!calibration.historical_validation_reference || !calibration.approved_reference || !calibration.effective_from) {
    return {
      status: 'CALIBRATION_GOVERNANCE_INCOMPLETE' as const,
      policy_cap: null,
      calibration_id: calibration.calibration_id,
      readiness: getHilalPolicyCapCalibrationReadiness(),
    };
  }

  const raw = calibration.compute_policy_cap({
    requested_amount: Math.max(input.requested_amount, 0),
    repayment_capacity: input.repayment_capacity === null ? null : Math.max(input.repayment_capacity, 0),
    cashflow_safe_limit: Math.max(input.cashflow_safe_limit, 0),
    signals: input.signals,
  });
  if (!Number.isFinite(raw) || raw < 0) {
    return {
      status: 'CALIBRATION_INVALID_OUTPUT' as const,
      policy_cap: null,
      calibration_id: calibration.calibration_id,
      readiness: getHilalPolicyCapCalibrationReadiness(),
    };
  }

  return {
    status: 'CALIBRATED' as const,
    policy_cap: raw,
    calibration_id: calibration.calibration_id,
    readiness: getHilalPolicyCapCalibrationReadiness(),
  };
}
