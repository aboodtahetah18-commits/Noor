import { Money } from './money';

/**
 * Deterministic deficit derived from an already-calculated balance-like value.
 * Forecasting is finalized separately; this helper only converts a negative result to a positive deficit amount.
 */
export function calculateExpectedDeficit(calculatedAmount: Money): Money {
  return calculatedAmount.isNegative() ? calculatedAmount.negate() : Money.zero();
}
