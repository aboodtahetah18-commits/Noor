export type WeeklyAnalysisRunStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface WeeklyAnalysisSummary {
  periodStart: string;
  cycleId: string;
  obligationTransitions: number;
  recommendationsCreated: number;
  recommendationsResolved: number;
  activeReasonCodes: string[];
  blockedRules: Array<{ reasonCode: string; issue: string }>;
  dashboardAvailable: boolean;
}

export interface WeeklyAnalysisRunResult {
  runId: string;
  idempotencyKey: string;
  status: WeeklyAnalysisRunStatus;
  reused: boolean;
  summary: WeeklyAnalysisSummary | null;
  errorCode: string | null;
}
