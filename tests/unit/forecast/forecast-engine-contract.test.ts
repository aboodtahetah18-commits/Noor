import { describe, expect, it } from 'vitest';
import { DeterministicForecastEngine } from '@/forecast/deterministic-forecast-engine';
import type { ForecastInput } from '@/forecast/types';

const validInput: ForecastInput = {
  cycleId: 'cycle-1',
  asOfDate: '2026-09-02',
  currentLiquidity: '10000.00',
  actualSpending: '1200.00',
  daysElapsed: 12,
  remainingDays: 18,
  upcomingObligations: '1800.00',
  expectedEssentialSpending: '1200.00',
  historicalPatterns: [],
};

describe('P56 deterministic ForecastEngine contract', () => {
  it('projects from current-cycle daily pace without hidden historical weighting', () => {
    const result = new DeterministicForecastEngine().forecast(validInput);
    expect(result).toEqual({
      status: 'FINALIZED',
      projectedEndBalance: '5200.00',
      expectedDeficit: '0.00',
      blockingIssue: null,
      pendingRule: null,
      engineVersion: 'P56-V1-CURRENT-CYCLE-PACE',
    });
  });

  it('does not silently change output when historical facts are supplied', () => {
    const engine = new DeterministicForecastEngine();
    const base = engine.forecast(validInput);
    const withHistory = engine.forecast({ ...validInput, historicalPatterns: [{ cycleId: 'closed-1', actualSpending: '9000.00', cycleDays: 30 }] });
    expect(withHistory.projectedEndBalance).toBe(base.projectedEndBalance);
  });

  it('returns a positive deficit when the projected balance is negative', () => {
    const result = new DeterministicForecastEngine().forecast({ ...validInput, currentLiquidity: '3000.00' });
    expect(result.projectedEndBalance).toBe('-1800.00');
    expect(result.expectedDeficit).toBe('1800.00');
  });

  it('validates edge facts and accepts zero remaining days', () => {
    expect(() => new DeterministicForecastEngine().forecast({ ...validInput, remainingDays: -1 })).toThrow('FORECAST_INVALID_REMAINING_DAYS');
    expect(() => new DeterministicForecastEngine().forecast({ ...validInput, remainingDays: 0 })).not.toThrow();
  });
});
