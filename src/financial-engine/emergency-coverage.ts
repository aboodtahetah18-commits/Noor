import { Money } from './money';

export interface EmergencyCoverageResult {
  coverageMonths: string | null;
  status: 'AVAILABLE' | 'UNAVAILABLE_NO_ESSENTIAL_BASELINE';
  targetPolicy: 'USER_DEFINED_AMOUNT';
  engineVersion: 'P56-V1';
}

/**
 * P56 / PENDING-BR-006: V1 does not impose an arbitrary 3/6/12-month target.
 * The owner defines target_amount. Coverage months is informational only.
 */
export function calculateEmergencyCoverage(currentBalance: Money, monthlyEssentialBaseline: Money): EmergencyCoverageResult {
  if (currentBalance.isNegative() || monthlyEssentialBaseline.isNegative()) throw new Error('EMERGENCY_COVERAGE_NEGATIVE_AMOUNT');
  if (monthlyEssentialBaseline.isZero()) return { coverageMonths: null, status: 'UNAVAILABLE_NO_ESSENTIAL_BASELINE', targetPolicy: 'USER_DEFINED_AMOUNT', engineVersion: 'P56-V1' };
  const basisPoints = (currentBalance.minorUnits * 10_000n) / monthlyEssentialBaseline.minorUnits;
  const whole = basisPoints / 10_000n;
  const fraction = ((basisPoints % 10_000n) / 100n).toString().padStart(2, '0');
  return { coverageMonths: `${whole}.${fraction}`, status: 'AVAILABLE', targetPolicy: 'USER_DEFINED_AMOUNT', engineVersion: 'P56-V1' };
}
