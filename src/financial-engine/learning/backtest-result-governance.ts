export type BacktestOutcome = 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | 'INVALID';

export interface BacktestResultInput {
  baselineVersion: string;
  candidateVersion: string;
  datasetStartsAt: string;
  datasetEndsAt: string;
  outcome: BacktestOutcome;
  metrics: Record<string, unknown>;
  evidence: Record<string, unknown>;
  completedAt: string;
  notes?: string | null;
}

export interface BacktestGovernanceDecision {
  valid: boolean;
  approvalAllowed: boolean;
  blockers: string[];
}

function validIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

export function evaluateBacktestResult(input: BacktestResultInput): BacktestGovernanceDecision {
  const blockers: string[] = [];
  if (!input.baselineVersion.trim()) blockers.push('BASELINE_VERSION_REQUIRED');
  if (!input.candidateVersion.trim()) blockers.push('CANDIDATE_VERSION_REQUIRED');
  if (input.baselineVersion === input.candidateVersion) blockers.push('CANDIDATE_MUST_DIFFER_FROM_BASELINE');
  if (!validIsoDate(input.datasetStartsAt) || !validIsoDate(input.datasetEndsAt)) blockers.push('VALID_DATASET_RANGE_REQUIRED');
  else if (input.datasetStartsAt > input.datasetEndsAt) blockers.push('DATASET_RANGE_REVERSED');
  if (!Number.isFinite(Date.parse(input.completedAt))) blockers.push('VALID_COMPLETION_TIMESTAMP_REQUIRED');
  if (!input.metrics || Object.keys(input.metrics).length === 0) blockers.push('BACKTEST_METRICS_REQUIRED');
  if (!input.evidence || Object.keys(input.evidence).length === 0) blockers.push('BACKTEST_EVIDENCE_REQUIRED');
  if (!['PASSED', 'FAILED', 'INCONCLUSIVE', 'INVALID'].includes(input.outcome)) blockers.push('INVALID_BACKTEST_OUTCOME');

  const valid = blockers.length === 0;
  return {
    valid,
    approvalAllowed: valid && input.outcome === 'PASSED',
    blockers,
  };
}

export function assertBacktestCanOpenApproval(input: BacktestResultInput): void {
  const decision = evaluateBacktestResult(input);
  if (!decision.valid) throw new Error(`BACKTEST_RESULT_INVALID:${decision.blockers.join(',')}`);
  if (!decision.approvalAllowed) throw new Error(`BACKTEST_APPROVAL_BLOCKED:${input.outcome}`);
}
