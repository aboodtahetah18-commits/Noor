import { Money } from '@/financial-engine/money';
import type { ForecastEngine, ForecastInput, ForecastResolvedResult } from './types';
import { validateForecastInput } from './validation';

/**
 * P56 / PENDING-BR-004 resolution.
 * V1 projects only from the current cycle's observed daily spending pace.
 * Historical patterns remain factual context but receive no hidden weighting.
 */
export class DeterministicForecastEngine implements ForecastEngine {
  forecast(input: ForecastInput): ForecastResolvedResult {
    validateForecastInput(input);
    const liquidity = Money.parse(input.currentLiquidity);
    const actualSpending = Money.parse(input.actualSpending);
    const obligations = Money.parse(input.upcomingObligations);
    const essentials = Money.parse(input.expectedEssentialSpending);
    const divisor = input.daysElapsed > 0 ? BigInt(input.daysElapsed) : 1n;
    const averageDaily = Money.fromMinorUnits(actualSpending.minorUnits / divisor);
    const projectedPaceSpend = Money.fromMinorUnits(averageDaily.minorUnits * BigInt(input.remainingDays));
    const projected = liquidity.subtract(obligations).subtract(essentials).subtract(projectedPaceSpend);
    const deficit = projected.isNegative() ? projected.negate() : Money.zero();
    return {
      status: 'FINALIZED',
      projectedEndBalance: projected.toString(),
      expectedDeficit: deficit.toString(),
      blockingIssue: null,
      pendingRule: null,
      engineVersion: 'P56-V1-CURRENT-CYCLE-PACE',
    };
  }
}

export const forecastEngine: ForecastEngine = new DeterministicForecastEngine();
