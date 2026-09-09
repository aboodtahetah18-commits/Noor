export interface ForecastHistoricalPattern {
  cycleId: string;
  actualSpending: string;
  cycleDays: number;
}

export interface ForecastInput {
  cycleId: string;
  asOfDate: string;
  currentLiquidity: string;
  actualSpending: string;
  daysElapsed: number;
  remainingDays: number;
  upcomingObligations: string;
  expectedEssentialSpending: string;
  /** Historical facts are accepted for explainability but receive no weight in P56-V1. */
  historicalPatterns?: readonly ForecastHistoricalPattern[];
}

export interface ForecastResolvedResult {
  status: 'FINALIZED';
  projectedEndBalance: string;
  expectedDeficit: string;
  blockingIssue: null;
  pendingRule: null;
  engineVersion: 'P56-V1-CURRENT-CYCLE-PACE';
}

export type ForecastResult = ForecastResolvedResult;
export interface ForecastEngine { forecast(input: ForecastInput): ForecastResolvedResult; }
