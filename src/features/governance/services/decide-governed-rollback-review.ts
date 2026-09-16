import { rawSql } from '@/infrastructure/db/client';
import { authorizationRepository } from '@/repositories/authorization-repository';
import { rollbackReviewRepository, type RollbackReviewDecision } from '@/repositories/rollback-review-repository';
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

export interface DecideGovernedRollbackReviewInput {
  actorUserId: string;
  reviewId: string;
  decision: RollbackReviewDecision;
  rationale: string;
  requestId?: string;
}

/** Authorizes only the review decision. It never executes the rollback itself. */
export async function decideGovernedRollbackReview(input: DecideGovernedRollbackReviewInput): Promise<void> {
  const rows = await rawSql`
    select
      rr.user_id::text as owner_user_id,
      rr.release_id::text as release_id,
      r.created_by_actor_user_id::text as release_creator_actor_id,
      lr.case_id::text as case_id,
      coalesce(lr.bank_key, p.spec_json->>'bankKey') as bank_key,
      p.spec_json->>'riskLevel' as risk_level,
      p.spec_json->>'materialityLevel' as materiality_level,
      p.spec_json->>'amount' as amount
    from public.algorithm_rollback_reviews rr
    join public.algorithm_releases r
      on r.id=rr.release_id and r.user_id=rr.user_id
    join public.algorithm_change_proposals p
      on p.id=r.proposal_id and p.user_id=r.user_id
    left join public.algorithm_learning_reviews lr
      on lr.proposal_id=p.id and lr.user_id=p.user_id
    where rr.id=${input.reviewId}::uuid
      and rr.status='PENDING_REVIEW'
    order by lr.created_at desc nulls last
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new Error('ROLLBACK_REVIEW_NOT_PENDING_OR_NOT_FOUND');

  const action = input.decision === 'APPROVED' ? 'APPROVE' : 'REJECT';
  const auth = await authorizationRepository.authorize({
    actorUserId: input.actorUserId,
    action,
    requestId: input.requestId,
    resource: {
      objectType: 'ROLLBACK_REVIEW',
      objectId: input.reviewId,
      ownerUserId: String(row.owner_user_id),
      caseId: row.case_id == null ? null : String(row.case_id),
      bankKey: row.bank_key == null ? null : String(row.bank_key),
      riskLevel: enumValue(row.risk_level, RISK),
      materialityLevel: enumValue(row.materiality_level, MATERIALITY),
      amount: finiteNumber(row.amount),
      releaseCreatorUserId: row.release_creator_actor_id == null ? null : String(row.release_creator_actor_id),
    },
  });
  if (auth.decision !== 'ALLOW') throw new Error(`AUTHORIZATION_DENIED:${auth.reason}`);

  await rollbackReviewRepository.decide(
    String(row.owner_user_id),
    input.reviewId,
    input.decision,
    input.rationale,
    input.actorUserId,
  );
}
