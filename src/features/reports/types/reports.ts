export type ReportSource = 'LIVE' | 'SNAPSHOT';

export interface ReportCycleHeader {
  id: string;
  name: string;
  status: string;
  startDate: string;
  expectedNextIncomeDate: string;
  source: ReportSource;
}

export interface ReportCategoryVariance {
  categoryId: string;
  categoryName: string;
  planned: string;
  actual: string;
  variance: string;
  utilizationPercent: string | null;
  status: string | null;
}

export interface CycleReport {
  cycle: ReportCycleHeader;
  income: { expected: string; actual: string };
  expense: { planned: string; actual: string; unplanned: string | null };
  saving: { planned: string; actual: string };
  finalResult: {
    surplus: string | null;
    deficit: string | null;
    status: 'FINALIZED' | 'PENDING_CLOSING';
  };
  emergencyContribution: string;
  goalContributions: string;
  categoryVariance: ReportCategoryVariance[];
  biggestOverrun: ReportCategoryVariance | null;
  advisorSummary: string | null;
  reviewStatus: string | null;
  closedAt: string | null;
}

export interface HistoricalCycleRow {
  cycleId: string;
  cycleName: string;
  startDate: string;
  closedAt: string;
  expectedIncome: string;
  actualIncome: string;
  plannedExpense: string;
  actualExpense: string;
  plannedSaving: string;
  actualSaving: string;
  emergencyContribution: string;
  goalContributions: string;
  surplus: string;
  deficit: string;
  actualEndBalance: string | null;
}

export interface HistoricalCyclesResult {
  items: HistoricalCycleRow[];
  requestedWindow: 3 | 6;
  availableCount: number;
  hasFullWindow: boolean;
}
