import { rawSql } from '@/infrastructure/db/client';
import { authorizationRepository } from '@/repositories/authorization-repository';
import { algorithmApprovalRepository, type AlgorithmGovernanceDecision } from '@/repositories/algorithm-approval-repository';
import type { MaterialityLevel, RiskLevel } from '@/governance/authorization-policy';

const RISK = new Set<RiskLevel>(['LOW','MEDIUM','HIGH','CRITICAL']);
const MATERIALITY = new Set<MaterialityLevel>(['LOW','MEDIUM','HIGH','CRITICAL']);

function enumValue<T extends string>(value: unknown, allowed: Set<T>): T | null {
  const v = String(value ?? '') as T;
  return allowed.has(v) ? v : null;
}

export interface RecordGovernedAlgorithmDecisionInput {
  actorUserId: string;
  proposalId: string;
  backtestRunId: string;
  decision: AlgorithmGovernanceDecision;
  rationale: string;
  requestId?: string;
}

export async function recordGovernedAlgorithmDecision(input: RecordGovernedAlgorithmDecisionInput): Promise<string> {
  const rows = await rawSql`
    select
      p.user_id::text as owner_user_id,
      p.created_by_actor_user_id::text as proposal_creator_actor_id,
      lr.case_id::text as case_id,
      lr.bank_key,
      p.spec_json->>'riskLevel' as risk_level,
      p.spec_json->>'materialityLevel' as materiality_level,
      p.spec_json->>'amount' as amount
    from public.algorithm_change_proposals p
    left join public.algorithm_learning_reviews lr
      on lr.proposal_id=p.id and lr.user_id=p.user_id
    where p.id=${input.proposalId}::uuid
    order by lr.created_at desc nulls last
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new Error('ALGORITHM_PROPOSAL_NOT_FOUND');

  const action = input.decision === 'APPROVED' ? 'APPROVE' : 'REJECT';
  const auth = await authorizationRepository.authorize({
    actorUserId: input.actorUserId,
    action,
    requestId: input.requestId,
    resource: {
      objectType: 'CHANGE_PROPOSAL',
      objectId: input.proposalId,
      ownerUserId: String(row.owner_user_id),
      caseId: row.case_id == null ? null : String(row.case_id),
      bankKey: row.bank_key == null ? null : String(row.bank_key),
      riskLevel: enumValue(row.risk_level, RISK),
      materialityLevel: enumValue(row.materiality_level, MATERIALITY),
      amount: row.amount == null ? null : Number(row.amount),
      proposalCreatorUserId: row.proposal_creator_actor_id == null ? null : String(row.proposal_creator_actor_id),
    },
  });
  if (auth.decision !== 'ALLOW') throw new Error(`AUTHORIZATION_DENIED:${auth.reason}`);

  return algorithmApprovalRepository.recordDecision({
    userId: String(row.owner_user_id),
    proposalId: input.proposalId,
    backtestRunId: input.backtestRunId,
    decision: input.decision,
    rationale: input.rationale,
    decidedByActorUserId: input.actorUserId,
  });
}
