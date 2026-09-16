import { rawSql } from '@/infrastructure/db/client';
import { buildGovernedReleaseArtifact } from '@/financial-engine/learning/governed-learning-governance';
import type { CalibrationCandidate, LearningEvidence, CauseClassification, VersionBundle } from '@/financial-engine/learning/governed-learning';
import { releaseGovernedAlgorithmChange } from './release-governed-algorithm-change';

const CAUSES = new Set<CauseClassification>([
  'ESTIMATION_ERROR','DATA_ERROR','USER_BEHAVIOR_VARIANCE','EXECUTION_VARIANCE','EXTERNAL_SHOCK',
  'POLICY_GAP','ALGORITHM_GAP','MODEL_CALIBRATION_ERROR','ASSUMPTION_FAILURE','NO_MATERIAL_ERROR',
]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, code: string): string {
  const v = String(value ?? '').trim();
  if (!v) throw new Error(code);
  return v;
}
function finite(value: unknown, code: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(code);
  return n;
}
function versions(value: unknown): VersionBundle {
  const v = record(value);
  return {
    policyVersion: text(v.policyVersion, 'RELEASE_POLICY_VERSION_REQUIRED'),
    algorithmVersion: text(v.algorithmVersion, 'RELEASE_ALGORITHM_VERSION_REQUIRED'),
    modelVersion: text(v.modelVersion, 'RELEASE_MODEL_VERSION_REQUIRED'),
    parameterVersion: text(v.parameterVersion, 'RELEASE_PARAMETER_VERSION_REQUIRED'),
  };
}
function candidateFrom(value: unknown): CalibrationCandidate {
  const c = record(value);
  return {
    parameter: text(c.parameter, 'RELEASE_CANDIDATE_PARAMETER_REQUIRED'),
    previousValue: finite(c.previousValue, 'RELEASE_CANDIDATE_PREVIOUS_VALUE_REQUIRED'),
    proposedValue: finite(c.proposedValue, 'RELEASE_CANDIDATE_PROPOSED_VALUE_REQUIRED'),
    boundedDelta: finite(c.boundedDelta, 'RELEASE_CANDIDATE_DELTA_REQUIRED'),
    evidenceCaseId: text(c.evidenceCaseId, 'RELEASE_CANDIDATE_CASE_REQUIRED'),
    sourceVersions: versions(c.sourceVersions),
    requiresBacktest: true,
    requiresApproval: true,
  };
}
function evidenceFrom(value: unknown): LearningEvidence {
  const e = record(value);
  const causeRaw = String(e.cause ?? '').trim().toUpperCase();
  if (!CAUSES.has(causeRaw as CauseClassification)) throw new Error('RELEASE_EVIDENCE_CAUSE_REQUIRED');
  const expectedValue = e.expectedValue == null ? undefined : finite(e.expectedValue, 'RELEASE_EXPECTED_VALUE_INVALID');
  const actualValue = e.actualValue == null ? undefined : finite(e.actualValue, 'RELEASE_ACTUAL_VALUE_INVALID');
  const learningReviewCompleted = e.learningReviewCompleted === true || ['COMPLETED','APPROVED'].includes(String(e.learningReviewStatus ?? '').toUpperCase());
  if (!learningReviewCompleted) throw new Error('RELEASE_LEARNING_REVIEW_NOT_COMPLETED');
  return {
    caseId: text(e.caseId, 'RELEASE_EVIDENCE_CASE_REQUIRED'),
    decisionId: text(e.decisionId, 'RELEASE_EVIDENCE_DECISION_REQUIRED'),
    learningReviewCompleted,
    cause: causeRaw as CauseClassification,
    sampleCount: Math.trunc(finite(e.sampleCount, 'RELEASE_SAMPLE_COUNT_REQUIRED')),
    evidenceConfidence: finite(e.evidenceConfidence, 'RELEASE_EVIDENCE_CONFIDENCE_REQUIRED'),
    expectedValue,
    actualValue,
    versions: versions(e.versions),
  };
}

export interface ReleaseGovernedChangeFromCaseInput {
  actorUserId: string;
  ownerUserId: string;
  caseId: string;
  requestId?: string;
}

/**
 * Builds a release exclusively from persisted, server-owned learning records.
 * No target/version/candidate/evidence/artifact value is accepted from the browser.
 */
export async function releaseGovernedAlgorithmChangeFromCase(input: ReleaseGovernedChangeFromCaseInput): Promise<string> {
  const rows = await rawSql`
    select
      p.id::text as proposal_id,
      p.target,
      p.current_version,
      p.candidate_version,
      p.spec_json,
      lr.lifecycle_json,
      d.id::text as approval_decision_id,
      b.id::text as backtest_run_id
    from public.algorithm_learning_reviews lr
    join public.algorithm_change_proposals p
      on p.id=lr.proposal_id and p.user_id=lr.user_id
    join public.algorithm_change_decisions d
      on d.proposal_id=p.id and d.user_id=p.user_id and d.decision='APPROVED'
    join public.algorithm_backtest_runs b
      on b.id=d.backtest_run_id and b.proposal_id=p.id and b.user_id=p.user_id and b.outcome='PASSED'
    where lr.user_id=${input.ownerUserId}::uuid
      and lr.case_id=${input.caseId}::uuid
      and not exists (
        select 1 from public.algorithm_releases r
        where r.user_id=lr.user_id and r.proposal_id=p.id
      )
    order by d.decided_at desc, lr.created_at desc
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new Error('CASE_RELEASE_NOT_READY');

  const spec = record(row.spec_json);
  const candidate = candidateFrom(spec.candidate);
  const evidence = evidenceFrom(row.lifecycle_json);
  const proposalId = text(row.proposal_id, 'RELEASE_PROPOSAL_REQUIRED');
  const approvalDecisionId = text(row.approval_decision_id, 'RELEASE_APPROVAL_REQUIRED');
  const target = text(row.target, 'RELEASE_TARGET_REQUIRED');
  const version = text(row.candidate_version, 'RELEASE_VERSION_REQUIRED');
  const previousVersion = text(row.current_version, 'RELEASE_PREVIOUS_VERSION_REQUIRED');

  if (candidate.evidenceCaseId !== input.caseId || evidence.caseId !== input.caseId) {
    throw new Error('CASE_RELEASE_EVIDENCE_MISMATCH');
  }

  const artifact = buildGovernedReleaseArtifact({
    proposalId,
    approvalDecisionId,
    target,
    version,
    previousVersion,
    candidate,
    evidence,
    gate: { backtestStatus: 'PASSED', proposalStatus: 'APPROVED' },
  });

  return releaseGovernedAlgorithmChange({
    actorUserId: input.actorUserId,
    proposalId,
    approvalDecisionId,
    target,
    version,
    previousVersion,
    artifact,
    requestId: input.requestId,
  });
}
