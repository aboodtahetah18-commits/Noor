import { rawSql } from '@/infrastructure/db/client';
import { authorizationRepository } from '@/repositories/authorization-repository';
import { algorithmGovernanceRepository } from '@/repositories/algorithm-governance-repository';
import type { GovernedReleaseArtifact } from '@/financial-engine/learning/governed-learning-governance';
import type { MaterialityLevel, RiskLevel } from '@/governance/authorization-policy';

const RISK = new Set<RiskLevel>(['LOW','MEDIUM','HIGH','CRITICAL']);
const MATERIALITY = new Set<MaterialityLevel>(['LOW','MEDIUM','HIGH','CRITICAL']);
function enumValue<T extends string>(value: unknown, allowed: Set<T>): T | null {
  const v = String(value ?? '') as T;
  return allowed.has(v) ? v : null;
}
function finiteNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export interface ReleaseGovernedAlgorithmChangeInput {
  actorUserId: string;
  proposalId: string;
  approvalDecisionId: string;
  target: string;
  version: string;
  previousVersion: string;
  artifact: GovernedReleaseArtifact;
  requestId?: string;
}

export async function releaseGovernedAlgorithmChange(input: ReleaseGovernedAlgorithmChangeInput): Promise<string> {
  const rows = await rawSql`
    select
      p.user_id::text as owner_user_id,
      d.decided_by_actor_user_id::text as approval_actor_id,
      lr.case_id::text as case_id,
      coalesce(lr.bank_key, p.spec_json->>'bankKey') as bank_key,
      p.spec_json->>'riskLevel' as risk_level,
      p.spec_json->>'materialityLevel' as materiality_level,
      p.spec_json->>'amount' as amount
    from public.algorithm_change_proposals p
    join public.algorithm_change_decisions d
      on d.id=${input.approvalDecisionId}::uuid
     and d.proposal_id=p.id
     and d.user_id=p.user_id
     and d.decision='APPROVED'
    left join public.algorithm_learning_reviews lr
      on lr.proposal_id=p.id and lr.user_id=p.user_id
    where p.id=${input.proposalId}::uuid
      and p.target=${input.target}
      and p.current_version=${input.previousVersion}
      and p.candidate_version=${input.version}
    order by lr.created_at desc nulls last
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new Error('ALGORITHM_RELEASE_SOURCE_NOT_APPROVED_OR_MISMATCHED');

  const auth = await authorizationRepository.authorize({
    actorUserId: input.actorUserId,
    action: 'RELEASE',
    requestId: input.requestId,
    resource: {
      objectType: 'RELEASE',
      objectId: input.proposalId,
      ownerUserId: String(row.owner_user_id),
      caseId: row.case_id == null ? null : String(row.case_id),
      bankKey: row.bank_key == null ? null : String(row.bank_key),
      riskLevel: enumValue(row.risk_level, RISK),
      materialityLevel: enumValue(row.materiality_level, MATERIALITY),
      amount: finiteNumber(row.amount),
      releaseApprovalActorUserId: row.approval_actor_id == null ? null : String(row.approval_actor_id),
    },
  });
  if (auth.decision !== 'ALLOW') throw new Error(`AUTHORIZATION_DENIED:${auth.reason}`);

  return algorithmGovernanceRepository.releaseApprovedCandidate({
    userId: String(row.owner_user_id),
    proposalId: input.proposalId,
    approvalDecisionId: input.approvalDecisionId,
    target: input.target,
    version: input.version,
    previousVersion: input.previousVersion,
    artifact: input.artifact,
    createdByActorUserId: input.actorUserId,
  });
}
