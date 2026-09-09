import { Money } from './money';
import { calculatePercentage, type PercentageResult } from './percentage';

export interface ProgressResult {
  raw: PercentageResult;
  display: PercentageResult;
  complete: boolean;
}

const ONE_HUNDRED_PERCENT: PercentageResult = { basisPoints: 10_000n, percent: '100.00' };

function calculateProgress(current: Money, target: Money): ProgressResult {
  if (!target.isPositive()) {
    throw new Error('Target amount must be greater than zero');
  }
  if (current.isNegative()) {
    throw new Error('Current amount must not be negative');
  }

  const raw = calculatePercentage(current.minorUnits, target.minorUnits);
  if (!raw) throw new Error('Unexpected zero target');
  const complete = current.compare(target) >= 0;

  return {
    raw,
    display: complete ? ONE_HUNDRED_PERCENT : raw,
    complete,
  };
}

export function calculateGoalProgress(current: Money, target: Money): ProgressResult {
  return calculateProgress(current, target);
}

export function calculateEmergencyProgress(current: Money, target: Money): ProgressResult {
  return calculateProgress(current, target);
}
