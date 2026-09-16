import { rawSql } from '@/infrastructure/db/client';
import { authorizationRepository } from '@/repositories/authorization-repository';
import type { GovernanceOperationsSnapshot } from '@/repositories/governance-operations-repository';
import type { MaterialityLevel, RiskLevel } from '@/governance/authorization-policy';

const RISK = new Set<RiskLevel>(['LOW','MEDIUM','HIGH','CRITICAL']);
const MATERIALITY = new Set<MaterialityLevel>(['LOW','MEDIUM','HIGH','CRITICAL']);
function enumValue<T extends string>(value: unknown, allowed: Set<T>): T | null {
  const v = String(value ?? '') as T;
  return allowed.has(v) ? v : null;
}
function finite(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export interface GovernanceActionCapabilities {
  approveProposal: boolean;
  rejectProposal: boolean;
  release: boolean;
  approveRollbackReview: boolean;
  rejectRollbackReview: boolean;
  rollback: boolean;
}

export async function getGovernanceActionCapabilities(input: {
  actorUserId: string;
  ownerUserId: string;
  caseId: string;
  snapshot: GovernanceOperationsSnapshot;
}): Promise<GovernanceActionCapabilities> {
  const empty: GovernanceActionCapabilities = {
    approveProposal: false,
    rejectProposal: false,
    release: false,
    approveRollbackReview: false,
    rejectRollbackReview: false,
    rollback: false,
  };
  const { snapshot } = input;
  if (!snapshot.learningReview) return empty;

  const rows = await rawSql`
    select
      p.created_by_actor_user_id::text as proposal_creator_actor_id,
      d.decided_by_actor_user_id::text as approval_actor_id,
      coalesce(lr.bank_key, p.spec_json->>'bankKey') as bank_key,
      p.spec_json->>'riskLevel' as risk_level,
      p.spec_json->>'materialityLevel' as materiality_level,
      p.spec_json->>'amount' as amount
    from public.algorithm_learning_reviews lr
    left join public.algorithm_change_proposals p on p.id=lr.proposal_id and p.user_id=lr.user_id
    left join public.algorithm_change_decisions d on d.id=${snapshot.approval?.id ?? null}::uuid and d.user_id=lr.user_id
    where lr.user_id=${input.ownerUserId}::uuid
      and lr.case_id=${input.caseId}::uuid
    order by lr.created_at desc
    limit 1
  `;
  const row = rows[0] ?? {};
  const base = {
    ownerUserId: input.ownerUserId,
    caseId: input.caseId,
    bankKey: row.bank_key == null ? null : String(row.bank_key),
    riskLevel: enumValue(row.risk_level, RISK),
    materialityLevel: enumValue(row.materiality_level, MATERIALITY),
    amount: finite(row.amount),
  };

  const proposalReady = Boolean(snapshot.proposal && snapshot.backtest?.runId && snapshot.backtest.requestStatus === 'COMPLETED' && !snapshot.approval);
  if (proposalReady && snapshot.proposal) {
    const proposalResource = {
      ...base,
      objectType: 'CHANGE_PROPOSAL' as const,
      objectId: snapshot.proposal.id,
      proposalCreatorUserId: row.proposal_creator_actor_id == null ? null : String(row.proposal_creator_actor_id),
    };
    empty.approveProposal = snapshot.backtest?.outcome === 'PASSED' && await authorizationRepository.can(
      input.actorUserId, 'APPROVE', 'CHANGE_PROPOSAL', snapshot.proposal.id, proposalResource,
    );
    empty.rejectProposal = await authorizationRepository.can(
      input.actorUserId, 'REJECT', 'CHANGE_PROPOSAL', snapshot.proposal.id, proposalResource,
    );
  }

  const releaseReady = Boolean(snapshot.proposal && snapshot.approval?.decision === 'APPROVED' && snapshot.backtest?.outcome === 'PASSED' && !snapshot.release);
  if (releaseReady && snapshot.proposal) {
    empty.release = await authorizationRepository.can(
      input.actorUserId,
      'RELEASE',
      'RELEASE',
      snapshot.proposal.id,
      {
        ...base,
        releaseApprovalActorUserId: row.approval_actor_id == null ? null : String(row.approval_actor_id),
      },
    );
  }

  const rollbackReviewReady = snapshot.rollbackReview?.status === 'PENDING_REVIEW';
  if (rollbackReviewReady && snapshot.rollbackReview) {
    empty.approveRollbackReview = await authorizationRepository.can(
      input.actorUserId, 'APPROVE', 'ROLLBACK_REVIEW', snapshot.rollbackReview.id, base,
    );
    empty.rejectRollbackReview = await authorizationRepository.can(
      input.actorUserId, 'REJECT', 'ROLLBACK_REVIEW', snapshot.rollbackReview.id, base,
    );
  }

  const rollbackReady = Boolean(snapshot.release && snapshot.rollbackReview?.status === 'APPROVED');
  if (rollbackReady && snapshot.release) {
    empty.rollback = await authorizationRepository.can(
      input.actorUserId, 'ROLLBACK', 'RELEASE', snapshot.release.id, base,
    );
  }

  return empty;
}
