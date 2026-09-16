import type { CalibrationCandidate, LearningEvidence, PromotionGate } from './governed-learning';
import { canPromoteCalibration } from './governed-learning';

export interface LearningTrace {
  caseId: string;
  decisionId: string;
  cause: LearningEvidence['cause'];
  sampleCount: number;
  evidenceConfidence: number;
  expectedValue?: number;
  actualValue?: number;
  sourceVersions: LearningEvidence['versions'];
  parameter: string;
  previousValue: number;
  proposedValue: number;
  boundedDelta: number;
  generatedAt: string;
}

export interface GovernedReleaseInput {
  proposalId: string;
  approvalDecisionId: string;
  target: string;
  version: string;
  previousVersion: string;
  candidate: CalibrationCandidate;
  evidence: LearningEvidence;
  gate: PromotionGate;
  releasedAt?: string;
}

export interface GovernedReleaseArtifact {
  mode: 'GOVERNED_REGISTRY_ONLY';
  target: string;
  version: string;
  previousVersion: string;
  parameter: string;
  approvedValue: number;
  previousValue: number;
  trace: LearningTrace;
  gate: {
    backtestStatus: 'PASSED';
    proposalStatus: 'APPROVED';
  };
  releasedAt: string;
}

export interface GovernedRollbackInput {
  releaseId: string;
  fromVersion: string;
  previousVersion: string;
  reason: string;
}

export interface GovernedRollbackEvent {
  releaseId: string;
  fromVersion: string;
  toVersion: string;
  reason: string;
}

export function buildLearningTrace(candidate: CalibrationCandidate, evidence: LearningEvidence, now = new Date()): LearningTrace {
  if (candidate.evidenceCaseId !== evidence.caseId) {
    throw new Error('CANDIDATE_EVIDENCE_CASE_MISMATCH');
  }
  return {
    caseId: evidence.caseId,
    decisionId: evidence.decisionId,
    cause: evidence.cause,
    sampleCount: evidence.sampleCount,
    evidenceConfidence: evidence.evidenceConfidence,
    expectedValue: evidence.expectedValue,
    actualValue: evidence.actualValue,
    sourceVersions: evidence.versions,
    parameter: candidate.parameter,
    previousValue: candidate.previousValue,
    proposedValue: candidate.proposedValue,
    boundedDelta: candidate.boundedDelta,
    generatedAt: now.toISOString(),
  };
}

export function buildGovernedReleaseArtifact(input: GovernedReleaseInput): GovernedReleaseArtifact {
  if (!canPromoteCalibration(input.gate)) throw new Error('ALGORITHM_RELEASE_GOVERNANCE_GATE_FAILED');
  if (!input.proposalId || !input.approvalDecisionId) throw new Error('ALGORITHM_RELEASE_APPROVAL_EVIDENCE_REQUIRED');
  if (!input.target || !input.version || !input.previousVersion) throw new Error('ALGORITHM_RELEASE_VERSION_METADATA_REQUIRED');
  if (input.version === input.previousVersion) throw new Error('ALGORITHM_RELEASE_VERSION_MUST_ADVANCE');

  return {
    mode: 'GOVERNED_REGISTRY_ONLY',
    target: input.target,
    version: input.version,
    previousVersion: input.previousVersion,
    parameter: input.candidate.parameter,
    approvedValue: input.candidate.proposedValue,
    previousValue: input.candidate.previousValue,
    trace: buildLearningTrace(input.candidate, input.evidence),
    gate: { backtestStatus: 'PASSED', proposalStatus: 'APPROVED' },
    releasedAt: input.releasedAt ?? new Date().toISOString(),
  };
}

export function buildGovernedRollback(input: GovernedRollbackInput): GovernedRollbackEvent {
  const reason = input.reason.trim();
  if (!input.releaseId || !input.fromVersion || !input.previousVersion) throw new Error('ALGORITHM_ROLLBACK_METADATA_REQUIRED');
  if (!reason) throw new Error('ALGORITHM_ROLLBACK_REASON_REQUIRED');
  if (input.fromVersion === input.previousVersion) throw new Error('ALGORITHM_ROLLBACK_TARGET_MUST_DIFFER');
  return {
    releaseId: input.releaseId,
    fromVersion: input.fromVersion,
    toVersion: input.previousVersion,
    reason,
  };
}
