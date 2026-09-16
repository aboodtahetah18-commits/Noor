import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import { assessPostReleaseObservation, type PostReleaseObservation, type PostReleaseAssessment } from '@/financial-engine/learning/post-release-monitoring';

export interface PersistPostReleaseObservationInput extends Omit<PostReleaseObservation, 'releaseId'> {
  userId: string;
  releaseId: string;
  evidence: Record<string, unknown>;
  observedAt: string;
}

export interface PersistPostReleaseObservationResult {
  monitoringId: string;
  assessment: PostReleaseAssessment;
  rollbackReviewId: string | null;
}

export class PostReleaseMonitoringRepository {
  async record(input: PersistPostReleaseObservationInput): Promise<PersistPostReleaseObservationResult> {
    const assessment = assessPostReleaseObservation(input);
    const monitoringId = randomUUID();
    const rollbackReviewId = assessment.action === 'PROPOSE_ROLLBACK_REVIEW' ? randomUUID() : null;

    const tx = [
      rawSql`
        insert into public.algorithm_release_monitoring
          (id,user_id,release_id,metric_key,previous_drift_score,normalized_residual,drift_score,severity,action,evidence_json,observed_at)
        select
          ${monitoringId}::uuid,
          r.user_id,
          r.id,
          ${input.metricKey},
          ${String(input.previousDriftScore)},
          ${String(input.normalizedResidual)},
          ${String(assessment.driftScore)},
          ${assessment.severity},
          ${assessment.action},
          ${JSON.stringify(input.evidence)}::jsonb,
          ${input.observedAt}::timestamptz
        from public.algorithm_releases r
        where r.id=${input.releaseId}::uuid
          and r.user_id=${input.userId}::uuid
        returning id::text as id
      `,
    ];

    if (rollbackReviewId) {
      tx.push(rawSql`
        insert into public.algorithm_rollback_reviews
          (id,user_id,release_id,monitoring_id,from_version,proposed_to_version,status,rationale,review_json)
        select
          ${rollbackReviewId}::uuid,
          r.user_id,
          r.id,
          ${monitoringId}::uuid,
          r.version,
          r.previous_version,
          'PENDING_REVIEW',
          ${assessment.reasons.join(' | ')},
          ${JSON.stringify({ assessment, metricKey: input.metricKey, evidence: input.evidence })}::jsonb
        from public.algorithm_releases r
        where r.id=${input.releaseId}::uuid
          and r.user_id=${input.userId}::uuid
          and r.version<>r.previous_version
        returning id::text as id
      `);
    }

    const results = await rawSql.transaction(tx);
    if (!results[0]?.[0]) throw new Error('POST_RELEASE_RELEASE_NOT_FOUND');
    if (rollbackReviewId && !results[1]?.[0]) throw new Error('ROLLBACK_REVIEW_CREATION_FAILED');

    return { monitoringId, assessment, rollbackReviewId };
  }
}

export const postReleaseMonitoringRepository = new PostReleaseMonitoringRepository();
