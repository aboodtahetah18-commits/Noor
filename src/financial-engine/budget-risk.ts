import type { BudgetCategoryStatus } from '@/domain/types';

export interface BudgetRiskInput {
  actualMinorUnits: bigint;
  budgetMinorUnits: bigint;
  daysElapsed: number;
  cycleDays: number;
}

/**
 * P56 / PENDING-BR-003 resolution.
 * OVER_BUDGET is authoritative once actual > budget.
 * Before that, AT_RISK means actual spend is ahead of the exact linear
 * plan pace for the elapsed portion of the cycle. No arbitrary 80% threshold.
 */
export function resolveBudgetCategoryStatus(input: BudgetRiskInput): BudgetCategoryStatus {
  if (input.budgetMinorUnits < 0n || input.actualMinorUnits < 0n) throw new Error('BUDGET_RISK_NEGATIVE_AMOUNT');
  if (!Number.isInteger(input.daysElapsed) || input.daysElapsed < 0) throw new Error('BUDGET_RISK_INVALID_DAYS_ELAPSED');
  if (!Number.isInteger(input.cycleDays) || input.cycleDays <= 0) throw new Error('BUDGET_RISK_INVALID_CYCLE_DAYS');
  if (input.actualMinorUnits > input.budgetMinorUnits) return 'OVER_BUDGET';
  if (input.budgetMinorUnits === 0n || input.daysElapsed === 0) return 'NORMAL';

  const elapsed = Math.min(input.daysElapsed, input.cycleDays);
  const aheadOfLinearPace = input.actualMinorUnits * BigInt(input.cycleDays) > input.budgetMinorUnits * BigInt(elapsed);
  return aheadOfLinearPace ? 'AT_RISK' : 'NORMAL';
}
