import { Money } from '@/financial-engine/money';
import type { BudgetCategoryStatus } from '@/domain/types';

/**
 * Explanatory signals only: a high merchant amount is not evidence of waste.
 * This module never posts transactions, changes budgets, or creates approvals.
 */
export type MerchantSpendingPressure =
  | 'CATEGORY_OVER_BUDGET'
  | 'CATEGORY_AT_RISK'
  | 'SPENDING_INCREASED'
  | 'NO_VERIFIED_PRESSURE';

export type MerchantSpendingSignal = {
  currentAmount: string;
  previousAmount: string;
  currentTransactionCount: number;
  changePercent: string | null;
  trend: 'INCREASED' | 'DECREASED' | 'UNCHANGED' | 'NO_BASELINE';
  pressure: MerchantSpendingPressure;
  categoryBudgetStatus: BudgetCategoryStatus | null;
  evidence: 'MATCHED_POSTED_TRANSACTIONS';
};

function percentageChange(currentMinor: bigint, previousMinor: bigint): string | null {
  // No historical baseline: do not assert infinite growth or a made-up 100%.
  if (previousMinor <= 0n) return null;
  const difference = currentMinor - previousMinor;
  const magnitude = difference < 0n ? -difference : difference;
  const hundredthsOfPercent = (magnitude * 10000n + previousMinor / 2n) / previousMinor;
  const whole = hundredthsOfPercent / 100n;
  const decimals = (hundredthsOfPercent % 100n).toString().padStart(2, '0');
  return `${difference < 0n ? '-' : difference > 0n ? '+' : ''}${whole}.${decimals}`;
}

export function assessMerchantSpending(input: {
  currentAmount: string;
  previousAmount: string;
  currentTransactionCount: number;
  categoryBudgetStatus: BudgetCategoryStatus | null;
}): MerchantSpendingSignal {
  const current = Money.parse(input.currentAmount);
  const previous = Money.parse(input.previousAmount);
  if (!Number.isSafeInteger(input.currentTransactionCount) || input.currentTransactionCount < 0) {
    throw new Error('MERCHANT_SPEND_INVALID_TRANSACTION_COUNT');
  }

  const trend: MerchantSpendingSignal['trend'] = previous.minorUnits <= 0n
    ? 'NO_BASELINE'
    : current.compare(previous) > 0
      ? 'INCREASED'
      : current.compare(previous) < 0
        ? 'DECREASED'
        : 'UNCHANGED';

  const positiveCurrentSpend = current.isPositive();
  let pressure: MerchantSpendingPressure = 'NO_VERIFIED_PRESSURE';
  if (positiveCurrentSpend && input.categoryBudgetStatus === 'OVER_BUDGET') {
    pressure = 'CATEGORY_OVER_BUDGET';
  } else if (positiveCurrentSpend && input.categoryBudgetStatus === 'AT_RISK') {
    pressure = 'CATEGORY_AT_RISK';
  } else if (trend === 'INCREASED') {
    pressure = 'SPENDING_INCREASED';
  }

  return {
    currentAmount: current.toString(),
    previousAmount: previous.toString(),
    currentTransactionCount: input.currentTransactionCount,
    changePercent: percentageChange(current.minorUnits, previous.minorUnits),
    trend,
    pressure,
    categoryBudgetStatus: input.categoryBudgetStatus,
    evidence: 'MATCHED_POSTED_TRANSACTIONS',
  };
}
