import { rawSql } from '@/infrastructure/db/client';

export type RollbackReviewDecision = 'APPROVED' | 'REJECTED';

export class RollbackReviewRepository {
  async decide(userId: string, reviewId: string, decision: RollbackReviewDecision, rationale: string): Promise<void> {
    const reason = rationale.trim();
    if (!reason) throw new Error('ROLLBACK_REVIEW_RATIONALE_REQUIRED');

    const rows = await rawSql`
      update public.algorithm_rollback_reviews rr
      set status=${decision},
          rationale=${reason},
          review_json=coalesce(rr.review_json,'{}'::jsonb) || ${JSON.stringify({ decision, decisionRationale: reason })}::jsonb
      from public.algorithm_releases r
      where rr.id=${reviewId}::uuid
        and rr.user_id=${userId}::uuid
        and rr.status='PENDING_REVIEW'
        and r.id=rr.release_id
        and r.user_id=rr.user_id
        and rr.from_version=r.version
        and rr.proposed_to_version=r.previous_version
      returning rr.id::text as id
    `;

    if (!rows[0]) throw new Error('ROLLBACK_REVIEW_NOT_PENDING_OR_MISMATCHED');
  }
}

export const rollbackReviewRepository = new RollbackReviewRepository();
