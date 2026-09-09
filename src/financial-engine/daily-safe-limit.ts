import { Money } from './money';

export interface DailySafeLimitResult {
  amount: Money;
  remainingDays: number;
  calculable: boolean;
}

export function calculateDailySafeLimit(safeToSpend: Money, remainingDays: number): DailySafeLimitResult {
  if (!Number.isInteger(remainingDays) || remainingDays < 0) {
    throw new Error('remainingDays must be a non-negative integer');
  }

  if (remainingDays === 0) {
    return { amount: Money.zero(), remainingDays, calculable: false };
  }

  const nonNegativeSafe = safeToSpend.max(Money.zero());
  return {
    amount: Money.fromMinorUnits(nonNegativeSafe.minorUnits / BigInt(remainingDays)),
    remainingDays,
    calculable: true,
  };
}
