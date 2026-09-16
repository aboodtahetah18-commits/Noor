import { rawSql } from '@/infrastructure/db/client';

export interface GovernanceOperationsSnapshot {
  learningReview: {
    id: string;
    bankKey: string;
    scope: string;
    action: string;
    cause: string;
    status: string;
    createdAt: string;
  } | null;
  proposal: {
    id: string;
    target: string;
    currentVersion: string;
    candidateVersion: string;
    title: string;
    rationale: string;
    createdAt: string;
  } | null;
  backtest: {
    requestId: string | null;
    requestStatus: string | null;
    runId: string | null;
    outcome: string | null;
    completedAt: string | null;
  } | null;
  approval: {
    id: string;
    decision: string;
    rationale: string;
    decidedAt: string;
  } | null;
  release: {
    id: string;
    version: string;
    previousVersion: string;
    target: string;
    releasedAt: string;
  } | null;
  monitoring: {
    id: string;
    metricKey: string;
    driftScore: string;
    severity: string;
    action: string;
    observedAt: string;
  } | null;
  rollbackReview: {
    id: string;
    fromVersion: string;
    proposedToVersion: string;
    status: string;
    rationale: string;
    decidedAt: string | null;
    createdAt: string;
  } | null;
}

function text(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return value == null ? null : String(value);
}

/**
 * User-scoped read model for the latest governed learning chain attached to one case.
 * It is intentionally read-only and cannot trigger approval, release, rollback, or any
 * external financial execution.
 */
export async function getGovernanceOperationsSnapshot(
  userId: string,
  caseId: string,
): Promise<GovernanceOperationsSnapshot> {
  const rows = await rawSql`
    with latest_review as (
      select lr.*
      from public.algorithm_learning_reviews lr
      where lr.user_id=${userId}::uuid
        and lr.case_id=${caseId}::uuid
      order by lr.created_at desc
      limit 1
    ), latest_backtest_request as (
      select br.*
      from public.algorithm_backtest_requests br
      join latest_review lr on lr.id=br.review_id
      where br.user_id=${userId}::uuid
      order by br.created_at desc
      limit 1
    ), latest_decision as (
      select d.*
      from public.algorithm_change_decisions d
      join latest_review lr on lr.proposal_id=d.proposal_id
      where d.user_id=${userId}::uuid
      order by d.decided_at desc
      limit 1
    ), latest_release as (
      select r.*
      from public.algorithm_releases r
      join latest_review lr on lr.proposal_id=r.proposal_id
      where r.user_id=${userId}::uuid
      order by r.released_at desc
      limit 1
    ), latest_monitoring as (
      select m.*
      from public.algorithm_release_monitoring m
      join latest_release r on r.id=m.release_id
      where m.user_id=${userId}::uuid
      order by m.observed_at desc, m.created_at desc
      limit 1
    ), latest_rollback_review as (
      select rr.*
      from public.algorithm_rollback_reviews rr
      join latest_release r on r.id=rr.release_id
      where rr.user_id=${userId}::uuid
      order by rr.created_at desc
      limit 1
    )
    select
      lr.id::text as learning_review_id,
      lr.bank_key,
      lr.learning_scope,
      lr.learning_action,
      lr.cause,
      lr.status as learning_review_status,
      lr.created_at::text as learning_review_created_at,
      p.id::text as proposal_id,
      p.target as proposal_target,
      p.current_version,
      p.candidate_version,
      p.title as proposal_title,
      p.rationale as proposal_rationale,
      p.created_at::text as proposal_created_at,
      br.id::text as backtest_request_id,
      br.status as backtest_request_status,
      b.id::text as backtest_run_id,
      b.outcome as backtest_outcome,
      b.completed_at::text as backtest_completed_at,
      d.id::text as approval_id,
      d.decision as approval_decision,
      d.rationale as approval_rationale,
      d.decided_at::text as approval_decided_at,
      r.id::text as release_id,
      r.target as release_target,
      r.version as release_version,
      r.previous_version,
      r.released_at::text as release_released_at,
      m.id::text as monitoring_id,
      m.metric_key,
      m.drift_score,
      m.severity as monitoring_severity,
      m.action as monitoring_action,
      m.observed_at::text as monitoring_observed_at,
      rr.id::text as rollback_review_id,
      rr.from_version as rollback_from_version,
      rr.proposed_to_version as rollback_proposed_to_version,
      rr.status as rollback_review_status,
      rr.rationale as rollback_rationale,
      rr.decided_at::text as rollback_decided_at,
      rr.created_at::text as rollback_created_at
    from latest_review lr
    left join public.algorithm_change_proposals p on p.id=lr.proposal_id and p.user_id=lr.user_id
    left join latest_backtest_request br on true
    left join public.algorithm_backtest_runs b on b.id=br.backtest_run_id and b.user_id=lr.user_id
    left join latest_decision d on true
    left join latest_release r on true
    left join latest_monitoring m on true
    left join latest_rollback_review rr on true
    limit 1
  `;

  const row = rows[0];
  if (!row) {
    return {
      learningReview: null,
      proposal: null,
      backtest: null,
      approval: null,
      release: null,
      monitoring: null,
      rollbackReview: null,
    };
  }

  const learningReviewId = text(row, 'learning_review_id');
  const proposalId = text(row, 'proposal_id');
  const backtestRequestId = text(row, 'backtest_request_id');
  const backtestRunId = text(row, 'backtest_run_id');
  const approvalId = text(row, 'approval_id');
  const releaseId = text(row, 'release_id');
  const monitoringId = text(row, 'monitoring_id');
  const rollbackReviewId = text(row, 'rollback_review_id');

  return {
    learningReview: learningReviewId ? {
      id: learningReviewId,
      bankKey: text(row, 'bank_key') ?? '—',
      scope: text(row, 'learning_scope') ?? '—',
      action: text(row, 'learning_action') ?? '—',
      cause: text(row, 'cause') ?? '—',
      status: text(row, 'learning_review_status') ?? '—',
      createdAt: text(row, 'learning_review_created_at') ?? '',
    } : null,
    proposal: proposalId ? {
      id: proposalId,
      target: text(row, 'proposal_target') ?? '—',
      currentVersion: text(row, 'current_version') ?? '—',
      candidateVersion: text(row, 'candidate_version') ?? '—',
      title: text(row, 'proposal_title') ?? '—',
      rationale: text(row, 'proposal_rationale') ?? '—',
      createdAt: text(row, 'proposal_created_at') ?? '',
    } : null,
    backtest: (backtestRequestId || backtestRunId) ? {
      requestId: backtestRequestId,
      requestStatus: text(row, 'backtest_request_status'),
      runId: backtestRunId,
      outcome: text(row, 'backtest_outcome'),
      completedAt: text(row, 'backtest_completed_at'),
    } : null,
    approval: approvalId ? {
      id: approvalId,
      decision: text(row, 'approval_decision') ?? '—',
      rationale: text(row, 'approval_rationale') ?? '—',
      decidedAt: text(row, 'approval_decided_at') ?? '',
    } : null,
    release: releaseId ? {
      id: releaseId,
      version: text(row, 'release_version') ?? '—',
      previousVersion: text(row, 'previous_version') ?? '—',
      target: text(row, 'release_target') ?? '—',
      releasedAt: text(row, 'release_released_at') ?? '',
    } : null,
    monitoring: monitoringId ? {
      id: monitoringId,
      metricKey: text(row, 'metric_key') ?? '—',
      driftScore: text(row, 'drift_score') ?? '—',
      severity: text(row, 'monitoring_severity') ?? '—',
      action: text(row, 'monitoring_action') ?? '—',
      observedAt: text(row, 'monitoring_observed_at') ?? '',
    } : null,
    rollbackReview: rollbackReviewId ? {
      id: rollbackReviewId,
      fromVersion: text(row, 'rollback_from_version') ?? '—',
      proposedToVersion: text(row, 'rollback_proposed_to_version') ?? '—',
      status: text(row, 'rollback_review_status') ?? '—',
      rationale: text(row, 'rollback_rationale') ?? '—',
      decidedAt: text(row, 'rollback_decided_at'),
      createdAt: text(row, 'rollback_created_at') ?? '',
    } : null,
  };
}
