import { Money, sumMoney } from './money';
import { calculatePercentage, type PercentageResult } from './percentage';

export function calculateCategoryActual(postedExpenses: readonly Money[], postedRefunds: readonly Money[] = []): Money {
  return sumMoney(postedExpenses).subtract(sumMoney(postedRefunds));
}

export function calculateCategoryRemaining(planned: Money, actual: Money): Money {
  return planned.subtract(actual);
}

export interface CategoryUtilizationResult {
  ratio: PercentageResult | null;
  hasSpendAgainstZeroBudget: boolean;
}

export function calculateCategoryUtilization(planned: Money, actual: Money): CategoryUtilizationResult {
  if (planned.isZero()) {
    return {
      ratio: actual.isZero() ? { basisPoints: 0n, percent: '0.00' } : null,
      hasSpendAgainstZeroBudget: actual.isPositive(),
    };
  }

  return {
    ratio: calculatePercentage(actual.minorUnits, planned.minorUnits),
    hasSpendAgainstZeroBudget: false,
  };
}
