import type {
  BudgetCategoryStatus,
  DeficitRiskStatus,
  EmergencyFundStatus,
  SafeToSpendStatus,
} from "@/domain/types";
import { resolveBudgetCategoryStatus as resolveBudgetRisk } from "@/financial-engine/budget-risk";

export function resolveDeficitRiskStatus(projectedEndBalance: number): DeficitRiskStatus {
  return projectedEndBalance < 0 ? "DEFICIT_RISK" : "NO_DEFICIT";
}

export function resolveSafeToSpendStatus(safeToSpend: number): SafeToSpendStatus {
  return safeToSpend > 0 ? "AVAILABLE" : "ZERO";
}

export interface EmergencyFundStatusInput {
  readonly configured: boolean;
  readonly currentBalance: number;
  readonly targetAmount: number;
  readonly wasPreviouslyFundedOrBuilding: boolean;
}

export function resolveEmergencyFundStatus(input: EmergencyFundStatusInput): EmergencyFundStatus {
  if (!input.configured) return "NOT_CONFIGURED";
  if (input.currentBalance <= 0 && input.wasPreviouslyFundedOrBuilding) return "DEPLETED";
  if (input.currentBalance >= input.targetAmount) return "FUNDED";
  return "BUILDING";
}

export function resolveBudgetCategoryOverrunStatus(input: {
  readonly actualSpend: number;
  readonly budget: number;
}): Exclude<BudgetCategoryStatus, "AT_RISK"> {
  return input.actualSpend > input.budget ? "OVER_BUDGET" : "NORMAL";
}

export function resolveBudgetCategoryStatus(input: {
  readonly actualSpendMinorUnits: bigint;
  readonly budgetMinorUnits: bigint;
  readonly daysElapsed: number;
  readonly cycleDays: number;
}): BudgetCategoryStatus {
  return resolveBudgetRisk({
    actualMinorUnits: input.actualSpendMinorUnits,
    budgetMinorUnits: input.budgetMinorUnits,
    daysElapsed: input.daysElapsed,
    cycleDays: input.cycleDays,
  });
}
