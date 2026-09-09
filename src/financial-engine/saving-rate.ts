import { Money } from './money';
import { calculatePercentage, type PercentageResult } from './percentage';

export function calculateSavingRate(actualSaving: Money, actualIncome: Money): PercentageResult | null {
  if (actualSaving.isNegative()) throw new Error('actualSaving must not be negative');
  if (actualIncome.isNegative()) throw new Error('actualIncome must not be negative');
  if (actualIncome.isZero()) return null;
  return calculatePercentage(actualSaving.minorUnits, actualIncome.minorUnits);
}
