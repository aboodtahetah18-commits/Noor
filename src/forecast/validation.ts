import { Money } from '@/financial-engine/money';
import type { ForecastInput } from './types';

function assertIsoDate(value: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`FORECAST_INVALID_${field.toUpperCase()}`);
  }
}

function assertNonNegativeInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`FORECAST_INVALID_${field.toUpperCase()}`);
  }
}

function assertNonNegativeMoney(value: string, field: string): void {
  const money = Money.parse(value);
  if (money.minorUnits < 0n) {
    throw new Error(`FORECAST_INVALID_${field.toUpperCase()}`);
  }
}

/**
 * Validates factual inputs only. It deliberately performs no projection.
 */
export function validateForecastInput(input: ForecastInput): void {
  if (!input.cycleId.trim()) throw new Error('FORECAST_INVALID_CYCLE_ID');
  assertIsoDate(input.asOfDate, 'as_of_date');
  assertNonNegativeMoney(input.currentLiquidity, 'current_liquidity');
  assertNonNegativeMoney(input.actualSpending, 'actual_spending');
  assertNonNegativeMoney(input.upcomingObligations, 'upcoming_obligations');
  assertNonNegativeMoney(input.expectedEssentialSpending, 'expected_essential_spending');
  assertNonNegativeInteger(input.daysElapsed, 'days_elapsed');
  assertNonNegativeInteger(input.remainingDays, 'remaining_days');

  for (const pattern of input.historicalPatterns ?? []) {
    if (!pattern.cycleId.trim()) throw new Error('FORECAST_INVALID_HISTORICAL_CYCLE_ID');
    assertNonNegativeMoney(pattern.actualSpending, 'historical_actual_spending');
    if (!Number.isInteger(pattern.cycleDays) || pattern.cycleDays <= 0) {
      throw new Error('FORECAST_INVALID_HISTORICAL_CYCLE_DAYS');
    }
  }
}
