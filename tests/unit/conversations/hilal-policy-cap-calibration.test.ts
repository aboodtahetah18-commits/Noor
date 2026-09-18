import { describe, expect, it } from 'vitest';
import {
  evaluateHilalPolicyCapCalibration,
  getHilalPolicyCapCalibrationReadiness,
  HILAL_POLICY_CAP_BASELINE_WEIGHTS,
  type HilalPolicyCapCalibration,
} from '@/lib/conversations/hilal-policy-cap-calibration';

const signals = {
  category_utilization_ratio: 0.75,
  current_vs_historical_spend_ratio: 1.1,
  outstanding_exposure: 3000,
  exposure_to_realized_income_ratio: 0.3,
  financing_frequency: 2,
  active_or_recovery_case_count: 1,
  overdue_installment_count: 0,
  overdue_planned_amount: 0,
  restructuring_applied_count_total: 1,
  restructuring_max_applied_per_case: 1,
  restructuring_precautionary_cap_reached: false,
  essential_category: true,
  expense_nature_default: 'NECESSARY',
};

describe('Hilal policy-cap calibration governance', () => {
  it('encodes the registry baseline weights to exactly 100%', () => {
    const readiness = getHilalPolicyCapCalibrationReadiness();
    expect(readiness.total_weight).toBe(100);
    expect(readiness.weights_sum_valid).toBe(true);
    expect(Object.values(HILAL_POLICY_CAP_BASELINE_WEIGHTS).map((x) => x.record_id)).toEqual([
      'WGT-007','WGT-008','WGT-009','WGT-010','WGT-011','WGT-012','WGT-013',
    ]);
  });

  it('does not produce a numeric governing cap without an approved calibration', () => {
    const result = evaluateHilalPolicyCapCalibration({
      requested_amount: 5000,
      repayment_capacity: 8000,
      cashflow_safe_limit: 9000,
      signals,
    });
    expect(result.status).toBe('CALIBRATION_NOT_GOVERNING');
    expect(result.policy_cap).toBeNull();
    expect(result.readiness.activation_blockers).toContain('HISTORICAL_VALIDATION_REQUIRED');
  });

  it('rejects a nominally approved calibration that lacks governance evidence', () => {
    const calibration: HilalPolicyCapCalibration = {
      calibration_id: 'test-incomplete',
      policy_version: '1.0-test',
      status: 'APPROVED_GOVERNING',
      historical_validation_reference: null,
      approved_reference: null,
      effective_from: null,
      compute_policy_cap: () => 4000,
    };
    const result = evaluateHilalPolicyCapCalibration({
      requested_amount: 5000,
      repayment_capacity: 8000,
      cashflow_safe_limit: 9000,
      signals,
      calibration,
    });
    expect(result.status).toBe('CALIBRATION_GOVERNANCE_INCOMPLETE');
    expect(result.policy_cap).toBeNull();
  });

  it('accepts a complete approved calibration contract', () => {
    const calibration: HilalPolicyCapCalibration = {
      calibration_id: 'test-approved',
      policy_version: '1.0-test',
      status: 'APPROVED_GOVERNING',
      historical_validation_reference: 'BACKTEST-001',
      approved_reference: 'GOV-001',
      effective_from: '2026-09-18',
      compute_policy_cap: () => 4200,
    };
    const result = evaluateHilalPolicyCapCalibration({
      requested_amount: 5000,
      repayment_capacity: 8000,
      cashflow_safe_limit: 9000,
      signals,
      calibration,
    });
    expect(result).toMatchObject({
      status: 'CALIBRATED',
      policy_cap: 4200,
      calibration_id: 'test-approved',
    });
  });
});
