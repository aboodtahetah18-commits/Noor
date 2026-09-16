import { rawSql } from '@/infrastructure/db/client';
import { authorizationRepository } from '@/repositories/authorization-repository';
import { algorithmGovernanceRepository } from '@/repositories/algorithm-governance-repository';
import type { GovernedRollbackEvent } from '@/financial-engine/learning/governed-learning-governance';
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

export interface ExecuteGovernedAlgorithmRollbackInput {
  actorUserId: string;
  event: GovernedRollbackEvent;
  requestId?: string;
}

export async function executeGovernedAlgorithmRollback(input: ExecuteGovernedAlgorithmRollbackInput): Promise<string> {
  const rows = await rawSql`
    select
      r.user_id::text as owner_user_id,
      lr.case_id::text as case_id,
      coalesce(lr.bank_key, p.spec_json->>'bankKey') as bank_key,
      p.spec_json->>'riskLevel' as risk_level,
      p.spec_json->>'materialityLevel' as materiality_level,
      p.spec_json->>'amount' as amount
    from public.algorithm_releases r
    join public.algorithm_change_proposals p
      on p.id=r.proposal_id and p.user_id=r.user_id
    join public.algorithm_rollback_reviews rr
      on rr.release_id=r.id
     and rr.user_id=r.user_id
     and rr.status='APPROVED'
     and rr.from_version=r.version
     and rr.proposed_to_version=r.previous_version
    left join public.algorithm_learning_reviews lr
      on lr.proposal_id=p.id and lr.user_id=p.user_id
    where r.id=${input.event.releaseId}::uuid
      and r.version=${input.event.fromVersion}
      and r.previous_version=${input.event.toVersion}
    order by rr.created_at desc, lr.created_at desc nulls last
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new Error('ALGORITHM_ROLLBACK_REQUIRES_APPROVED_REVIEW');

  const auth = await authorizationRepository.authorize({
    actorUserId: input.actorUserId,
    action: 'ROLLBACK',
    requestId: input.requestId,
    resource: {
      objectType: 'RELEASE',
      objectId: input.event.releaseId,
      ownerUserId: String(row.owner_user_id),
      caseId: row.case_id == null ? null : String(row.case_id),
      bankKey: row.bank_key == null ? null : String(row.bank_key),
      riskLevel: enumValue(row.risk_level, RISK),
      materialityLevel: enumValue(row.materiality_level, MATERIALITY),
      amount: finiteNumber(row.amount),
    },
  });
  if (auth.decision !== 'ALLOW') throw new Error(`AUTHORIZATION_DENIED:${auth.reason}`);

  return algorithmGovernanceRepository.rollbackRelease(
    String(row.owner_user_id),
    input.event,
    input.actorUserId,
  );
}
