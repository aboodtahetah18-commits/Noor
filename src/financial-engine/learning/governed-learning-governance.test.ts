import { describe, expect, it } from 'vitest';
import type { CalibrationCandidate, LearningEvidence } from './governed-learning';
import { buildGovernedReleaseArtifact, buildGovernedRollback, buildLearningTrace } from './governed-learning-governance';

const evidence: LearningEvidence = {
  caseId: 'CASE-42',
  decisionId: 'DEC-9',
  learningReviewCompleted: true,
  cause: 'MODEL_CALIBRATION_ERROR',
  sampleCount: 18,
  evidenceConfidence: 0.93,
  expectedValue: 0.4,
  actualValue: 0.46,
  versions: {
    policyVersion: 'P-3',
    algorithmVersion: 'A-7',
    modelVersion: 'M-4',
    parameterVersion: 'RISK-11',
  },
};

const candidate: CalibrationCandidate = {
  parameter: 'riskWeight',
  previousValue: 0.4,
  proposedValue: 0.45,
  boundedDelta: 0.05,
  evidenceCaseId: 'CASE-42',
  sourceVersions: evidence.versions,
  requiresBacktest: true,
  requiresApproval: true,
};

describe('governed learning governance', () => {
  it('preserves the complete explainability trace', () => {
    const trace = buildLearningTrace(candidate, evidence, new Date('2026-09-16T12:00:00.000Z'));
    expect(trace).toMatchObject({
      caseId: 'CASE-42',
      decisionId: 'DEC-9',
      cause: 'MODEL_CALIBRATION_ERROR',
      parameter: 'riskWeight',
      previousValue: 0.4,
      proposedValue: 0.45,
      boundedDelta: 0.05,
      sourceVersions: evidence.versions,
    });
  });

  it('rejects release without a passed backtest and approval', () => {
    expect(() => buildGovernedReleaseArtifact({
      proposalId: 'PROP-1', approvalDecisionId: 'APP-1', target: 'risk-engine', version: 'A-8', previousVersion: 'A-7',
      candidate, evidence, gate: { backtestStatus: 'FAILED', proposalStatus: 'APPROVED' },
    })).toThrow('ALGORITHM_RELEASE_GOVERNANCE_GATE_FAILED');

    expect(() => buildGovernedReleaseArtifact({
      proposalId: 'PROP-1', approvalDecisionId: 'APP-1', target: 'risk-engine', version: 'A-8', previousVersion: 'A-7',
      candidate, evidence, gate: { backtestStatus: 'PASSED', proposalStatus: 'PENDING' },
    })).toThrow('ALGORITHM_RELEASE_GOVERNANCE_GATE_FAILED');
  });

  it('creates a registry-only release artifact after both gates pass', () => {
    const artifact = buildGovernedReleaseArtifact({
      proposalId: 'PROP-1', approvalDecisionId: 'APP-1', target: 'risk-engine', version: 'A-8', previousVersion: 'A-7',
      candidate, evidence, gate: { backtestStatus: 'PASSED', proposalStatus: 'APPROVED' }, releasedAt: '2026-09-16T12:05:00.000Z',
    });
    expect(artifact.mode).toBe('GOVERNED_REGISTRY_ONLY');
    expect(artifact.gate).toEqual({ backtestStatus: 'PASSED', proposalStatus: 'APPROVED' });
    expect(artifact.trace.caseId).toBe('CASE-42');
  });

  it('rolls back only to the previous version captured by the release', () => {
    expect(buildGovernedRollback({
      releaseId: 'REL-1', fromVersion: 'A-8', previousVersion: 'A-7', reason: 'Post-release drift exceeded governed threshold',
    })).toEqual({
      releaseId: 'REL-1', fromVersion: 'A-8', toVersion: 'A-7', reason: 'Post-release drift exceeded governed threshold',
    });
  });

  it('rejects an empty rollback reason', () => {
    expect(() => buildGovernedRollback({ releaseId: 'REL-1', fromVersion: 'A-8', previousVersion: 'A-7', reason: '   ' }))
      .toThrow('ALGORITHM_ROLLBACK_REASON_REQUIRED');
  });
});
