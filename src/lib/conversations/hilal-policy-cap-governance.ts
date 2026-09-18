import type { HilalExposureProfile } from './hilal-exposure-profile';

export type HilalPolicyCapSignals = {
  category_utilization_ratio: number | null;
  current_vs_historical_spend_ratio: number | null;
  outstanding_exposure: number;
  exposure_to_realized_income_ratio: number | null;
  financing_frequency: number;
  active_or_recovery_case_count: number;
  overdue_installment_count: number;
  overdue_planned_amount: number;
  restructuring_applied_count_total: number;
  restructuring_max_applied_per_case: number;
  restructuring_precautionary_cap_reached: boolean;
  essential_category: boolean | null;
  expense_nature_default: string | null;
};

export type HilalPolicyCapGovernanceResult = {
  policy_cap: number | null;
  status: 'HARD_STOP_OVERDUE' | 'NUMERIC_CALIBRATION_REQUIRED';
  hard_stop: boolean;
  hard_stop_reason: 'OVERDUE_REPAYMENT' | null;
  signals: HilalPolicyCapSignals;
  calibration_version: null;
  policy_reference: 'HILAL_POLICY_1.0_SECTIONS_6_8_10_12_13_14';
};

export type HilalPolicyCapGovernanceInput = {
  plannedAmount: number | null;
  actualSpend: number | null;
  historicalAverageSpend: number | null;
  realizedIncome: number;
  isEssential: boolean | null;
  expenseNatureDefault: string | null;
  exposure: HilalExposureProfile | null;
};

function ratio(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

export function evaluateHilalPolicyCapGovernance(input: HilalPolicyCapGovernanceInput): HilalPolicyCapGovernanceResult {
  const exposure = input.exposure;
  const outstandingExposure = exposure?.outstanding_exposure ?? 0;
  const overdueInstallments = exposure?.overdue_installment_count ?? 0;
  const overdueAmount = exposure?.overdue_planned_amount ?? 0;

  const signals: HilalPolicyCapSignals = {
    category_utilization_ratio:
      typeof input.plannedAmount === 'number' && typeof input.actualSpend === 'number'
        ? ratio(Math.max(input.actualSpend, 0), Math.max(input.plannedAmount, 0))
        : null,
    current_vs_historical_spend_ratio:
      typeof input.actualSpend === 'number' && typeof input.historicalAverageSpend === 'number'
        ? ratio(Math.max(input.actualSpend, 0), Math.max(input.historicalAverageSpend, 0))
        : null,
    outstanding_exposure: outstandingExposure,
    exposure_to_realized_income_ratio: ratio(outstandingExposure, Math.max(input.realizedIncome, 0)),
    financing_frequency: exposure?.total_case_count ?? 0,
    active_or_recovery_case_count: (exposure?.active_case_count ?? 0) + (exposure?.recovery_case_count ?? 0),
    overdue_installment_count: overdueInstallments,
    overdue_planned_amount: overdueAmount,
    restructuring_applied_count_total: exposure?.restructuring.applied_count_total ?? 0,
    restructuring_max_applied_per_case: exposure?.restructuring.max_applied_per_case ?? 0,
    restructuring_precautionary_cap_reached: exposure?.restructuring.precautionary_cap_reached ?? false,
    essential_category: input.isEssential,
    expense_nature_default: input.expenseNatureDefault,
  };

  // Approved Hilal policy: repayment delay reclassifies eligibility and stops
  // new financing until the reason is addressed. This is a hard zero cap, not
  // a discretionary score or invented threshold.
  if (overdueInstallments > 0 || overdueAmount > 0) {
    return {
      policy_cap: 0,
      status: 'HARD_STOP_OVERDUE',
      hard_stop: true,
      hard_stop_reason: 'OVERDUE_REPAYMENT',
      signals,
      calibration_version: null,
      policy_reference: 'HILAL_POLICY_1.0_SECTIONS_6_8_10_12_13_14',
    };
  }

  return {
    policy_cap: null,
    status: 'NUMERIC_CALIBRATION_REQUIRED',
    hard_stop: false,
    hard_stop_reason: null,
    signals,
    calibration_version: null,
    policy_reference: 'HILAL_POLICY_1.0_SECTIONS_6_8_10_12_13_14',
  };
}
