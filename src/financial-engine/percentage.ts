export interface PercentageResult {
  /** Basis points: 10_000 = 100.00% */
  basisPoints: bigint;
  percent: string;
}

export function calculatePercentage(numerator: bigint, denominator: bigint): PercentageResult | null {
  if (denominator === 0n) return null;

  // Half-up rounding to two decimal percentage points (basis points).
  const scaled = numerator * 10_000n;
  const absDenominator = denominator < 0n ? -denominator : denominator;
  const adjustment = absDenominator / 2n;
  const adjusted = scaled >= 0n ? scaled + adjustment : scaled - adjustment;
  const basisPoints = adjusted / denominator;

  const negative = basisPoints < 0n;
  const absolute = negative ? -basisPoints : basisPoints;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');

  return {
    basisPoints,
    percent: `${negative ? '-' : ''}${whole}.${fraction}`,
  };
}
