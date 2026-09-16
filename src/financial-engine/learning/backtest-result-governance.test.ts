import { describe, expect, it } from 'vitest';
import { evaluateBacktestResult } from './backtest-result-governance';

const base = {
  baselineVersion: 'v1',
  candidateVersion: 'v2',
  datasetStartsAt: '2026-01-01',
  datasetEndsAt: '2026-06-30',
  outcome: 'PASSED' as const,
  metrics: { mae: 0.08 },
  evidence: { sampleCount: 120 },
  completedAt: '2026-09-16T18:00:00Z',
};

describe('backtest result governance', () => {
  it('opens approval only for a valid PASSED result', () => {
    expect(evaluateBacktestResult(base)).toEqual({ valid: true, approvalAllowed: true, blockers: [] });
  });

  it('blocks approval for failed or inconclusive outcomes', () => {
    expect(evaluateBacktestResult({ ...base, outcome: 'FAILED' }).approvalAllowed).toBe(false);
    expect(evaluateBacktestResult({ ...base, outcome: 'INCONCLUSIVE' }).approvalAllowed).toBe(false);
  });

  it('rejects a result without metrics and evidence', () => {
    const decision = evaluateBacktestResult({ ...base, metrics: {}, evidence: {} });
    expect(decision.valid).toBe(false);
    expect(decision.blockers).toContain('BACKTEST_METRICS_REQUIRED');
    expect(decision.blockers).toContain('BACKTEST_EVIDENCE_REQUIRED');
  });

  it('rejects same baseline and candidate version', () => {
    const decision = evaluateBacktestResult({ ...base, candidateVersion: 'v1' });
    expect(decision.valid).toBe(false);
    expect(decision.blockers).toContain('CANDIDATE_MUST_DIFFER_FROM_BASELINE');
  });
});
