import type { FinancialCycleStatus, ObligationStatus, GoalStatus, EmergencyFundStatus } from '@/domain/types';

export type DashboardBlockedMetric = {
  amount: null;
  status: 'BLOCKED';
  blockingIssue: 'BUFFER_POLICY_REQUIRED';
};

export type DashboardResolvedMetric = {
  amount: string;
  status: 'AVAILABLE' | 'ZERO' | 'FINALIZED';
  blockingIssue: null;
};

export type DashboardMetric = DashboardBlockedMetric | DashboardResolvedMetric;

export interface DashboardCycleSummary {
  id: string;
  name: string;
  status: FinancialCycleStatus;
  startDate: string;
  expectedNextIncomeDate: string;
  remainingDays: number;
  source: 'LIVE' | 'SNAPSHOT';
}

export interface DashboardObligationSummary {
  id: string;
  name: string;
  amount: string;
  dueDate: string;
  status: ObligationStatus;
  isReserved: boolean;
}

export interface DashboardGoalSummary {
  id: string;
  name: string;
  status: GoalStatus;
  targetAmount: string;
  currentBalance: string;
  progressPercent: string;
  targetDate: string | null;
}

export interface DashboardRecommendationSummary {
  id: string;
  type: string;
  priority: number;
  title: string;
  message: string;
  reasonCode: string;
  status: string;
}

export interface DashboardEmergencySummary {
  status: EmergencyFundStatus;
  targetAmount: string | null;
  currentBalance: string;
  progressPercent: string | null;
  planned: string;
  allocated: string;
  actualTransferred: string;
}

export interface DashboardSummary {
  cycle: DashboardCycleSummary;
  liquidity: { total: string };
  safeToSpend: DashboardMetric;
  dailySafeLimit: DashboardMetric;
  income: { expected: string; actual: string };
  budget: { planned: string; actual: string; remaining: string; utilizationPercent: string | null };
  saving: { planned: string; actual: string; rate: string | null };
  forecast: {
    projectedEndBalance: string | null;
    expectedDeficit: string | null;
    deficitStatus: 'BUFFER_POLICY_REQUIRED' | 'AVAILABLE' | 'FINALIZED';
    blockingIssue: null;
  };
  upcomingObligations: DashboardObligationSummary[];
  topRecommendation: DashboardRecommendationSummary | null;
  recommendationEngineStatus: 'PENDING_PHASE_22' | 'AVAILABLE';
  emergencySummary: DashboardEmergencySummary | null;
  goalSummaries: DashboardGoalSummary[];
}
