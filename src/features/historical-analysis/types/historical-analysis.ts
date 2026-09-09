import type { HistoricalCycleRow } from '@/features/reports/types/reports';

export type TrendDirection = 'IMPROVING' | 'DECLINING' | 'STABLE' | 'INSUFFICIENT_DATA';

export interface HistoricalMetricAverage {
  actualIncome: string;
  actualExpense: string;
  actualSaving: string;
  surplus: string;
  deficit: string;
  emergencyContribution: string;
  goalContributions: string;
  actualEndBalance: string | null;
}

export interface HistoricalTrend {
  metric: 'ACTUAL_INCOME' | 'ACTUAL_EXPENSE' | 'ACTUAL_SAVING' | 'SURPLUS' | 'DEFICIT' | 'END_BALANCE';
  direction: TrendDirection;
  firstValue: string | null;
  latestValue: string | null;
  absoluteChange: string | null;
}

export interface HistoricalAnalysisResult {
  requestedWindow: 3 | 6;
  availableCount: number;
  hasFullWindow: boolean;
  source: 'CLOSED_CYCLE_SNAPSHOTS_ONLY';
  items: HistoricalCycleRow[];
  averages: HistoricalMetricAverage | null;
  trends: HistoricalTrend[];
  recurringSignals: {
    cyclesWithSurplus: number;
    cyclesWithDeficit: number;
    cyclesSavingAtOrAbovePlan: number;
    cyclesExpenseAtOrBelowPlan: number;
  } | null;
}
