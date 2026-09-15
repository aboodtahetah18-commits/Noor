import { getRawSql } from '@/infrastructure/db/client';
import { FinancialPlatformError, mapFinancialDatabaseError } from '@/features/financial-engine/services/financial-platform-error';

export type UserDecisionAction = 'APPROVE' | 'REJECT' | 'DEFER' | 'MODIFY';

function positiveAmount(value: string | null | undefined): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new FinancialPlatformError('INVALID_AMOUNT', 422);
  return n;
}

export async function createDecisionRequestFromRecommendation(input: {
  userId: string;
  recommendationId: string;
  requestedAmount?: string | null;
}) {
  const sql = getRawSql();
  const rows = await sql`
    SELECT
      r.id,r.cycle_id,r.reason_code,r.reason_data,r.status AS recommendation_status,
      g.gate_status,g.sensitivity,g.readiness_snapshot,g.hard_gate_code,g.score_assessment_id,
      a.engine_version,a.weights_version,a.thresholds_version,a.engine_snapshot_id,
      s.policy_version
    FROM public.recommendations r
    LEFT JOIN public.recommendation_engine_gates g ON g.recommendation_id=r.id AND g.user_id=r.user_id
    LEFT JOIN public.cycle_financial_score_assessments a ON a.id=g.score_assessment_id AND a.user_id=r.user_id
    LEFT JOIN public.cycle_financial_engine_snapshots s ON s.id=a.engine_snapshot_id AND s.user_id=r.user_id
    WHERE r.id=${input.recommendationId}::uuid AND r.user_id=${input.userId}::uuid
    LIMIT 1
  `;
  const rec = rows[0];
  if (!rec) throw new FinancialPlatformError('RECOMMENDATION_NOT_FOUND', 404);
  if (!rec.cycle_id) throw new FinancialPlatformError('RECOMMENDATION_HAS_NO_CYCLE', 409);
  if (!['NEW','VIEWED','ACCEPTED'].includes(String(rec.recommendation_status))) {
    throw new FinancialPlatformError('RECOMMENDATION_NOT_ACTIONABLE', 409);
  }
  if (!rec.gate_status) throw new FinancialPlatformError('RECOMMENDATION_GATE_REQUIRED', 409);
  if (String(rec.gate_status) === 'BLOCKED') throw new FinancialPlatformError('RECOMMENDATION_BLOCKED', 409);

  const reasonData = (rec.reason_data && typeof rec.reason_data === 'object' ? rec.reason_data : {}) as Record<string, unknown>;
  const capRaw = reasonData.safe_allocation_ceiling ?? reasonData.recommended_amount ?? null;
  const cap = capRaw == null ? null : Number(capRaw);
  const requested = positiveAmount(input.requestedAmount);
  if (requested != null && cap != null && Number.isFinite(cap) && requested > cap + 0.000001) {
    throw new FinancialPlatformError('REQUESTED_AMOUNT_EXCEEDS_RECOMMENDATION', 422);
  }

  const sensitivity = String(rec.sensitivity);
  const materiality = sensitivity === 'CRITICAL' ? 'CRITICAL' : sensitivity === 'SENSITIVE' ? 'HIGH' : sensitivity === 'STANDARD' ? 'MEDIUM' : 'LOW';
  const decisionType = `RECOMMENDATION:${String(rec.reason_code)}`;
  const amount = requested ?? (cap != null && Number.isFinite(cap) && cap > 0 ? cap : null);

  try {
    const existing = await sql`
      SELECT id,status,requested_amount,created_at
      FROM public.decision_requests
      WHERE user_id=${input.userId}::uuid AND recommendation_id=${input.recommendationId}::uuid
        AND status NOT IN ('CANCELLED','CLOSED','REJECTED')
      ORDER BY created_at DESC LIMIT 1
    `;
    if (existing[0]) return { request: existing[0], created: false };

    const inserted = await sql`
      INSERT INTO public.decision_requests(
        user_id,recommendation_id,decision_type,subject_type,subject_id,requested_amount,materiality,status,
        policy_version,weights_version,thresholds_version,engine_version,data_snapshot_id
      ) VALUES(
        ${input.userId}::uuid,${input.recommendationId}::uuid,${decisionType},'RECOMMENDATION',${input.recommendationId}::uuid,
        ${amount},${materiality},'DRAFT',${rec.policy_version ?? null},${rec.weights_version ?? null},${rec.thresholds_version ?? null},
        ${rec.engine_version ?? null},${rec.engine_snapshot_id == null ? null : String(rec.engine_snapshot_id)}
      ) RETURNING id,status,requested_amount,created_at
    `;
    const requestId = String(inserted[0].id);

    await sql`UPDATE public.decision_requests SET status='UNDER_REVIEW',updated_at=now() WHERE id=${requestId}::uuid AND user_id=${input.userId}::uuid`;
    await sql`UPDATE public.decision_requests SET status='RECOMMENDED',updated_at=now() WHERE id=${requestId}::uuid AND user_id=${input.userId}::uuid`;

    const conditionalSensitive = String(rec.gate_status) === 'CONDITIONAL' && ['SENSITIVE','CRITICAL'].includes(sensitivity);
    const nextStatus = conditionalSensitive ? 'REVALIDATION_REQUIRED' : 'USER_DECISION_REQUIRED';
    const finalRows = await sql`
      UPDATE public.decision_requests SET status=${nextStatus},updated_at=now()
      WHERE id=${requestId}::uuid AND user_id=${input.userId}::uuid
      RETURNING id,status,requested_amount,materiality,created_at,updated_at
    `;
    return { request: finalRows[0], created: true };
  } catch (error) {
    throw mapFinancialDatabaseError(error);
  }
}

export async function recordUserDecision(input: {
  userId: string;
  decisionRequestId: string;
  action: UserDecisionAction;
  note?: string | null;
}) {
  const sql = getRawSql();
  const requests = await sql`
    SELECT id,recommendation_id,decision_type,requested_amount,status,materiality
    FROM public.decision_requests
    WHERE id=${input.decisionRequestId}::uuid AND user_id=${input.userId}::uuid
    LIMIT 1
  `;
  const request = requests[0];
  if (!request) throw new FinancialPlatformError('DECISION_REQUEST_NOT_FOUND', 404);
  if (String(request.status) !== 'USER_DECISION_REQUIRED') throw new FinancialPlatformError('DECISION_NOT_AWAITING_USER', 409);

  try {
    const inserted = await sql`
      INSERT INTO public.user_decisions(user_id,decision_request_id,recommendation_id,action,note,status)
      VALUES(${input.userId}::uuid,${input.decisionRequestId}::uuid,${request.recommendation_id ?? null},${input.action},${input.note ?? null},'RECORDED')
      RETURNING id,action,status,decided_at
    `;
    const userDecision = inserted[0];
    const target = input.action === 'APPROVE' ? 'APPROVED' : input.action === 'REJECT' ? 'REJECTED' : input.action === 'DEFER' ? 'DEFERRED' : 'REVALIDATION_REQUIRED';

    await sql`
      UPDATE public.decision_requests
      SET status=${target},updated_at=now()
      WHERE id=${input.decisionRequestId}::uuid AND user_id=${input.userId}::uuid AND status='USER_DECISION_REQUIRED'
    `;

    let task: Record<string, unknown> | null = null;
    if (input.action === 'APPROVE') {
      const existingTask = await sql`
        SELECT id,status,action_type,amount,currency,evidence_requirement,required_by
        FROM public.execution_tasks
        WHERE user_id=${input.userId}::uuid AND user_decision_id=${String(userDecision.id)}::uuid
        LIMIT 1
      `;
      if (existingTask[0]) task = existingTask[0];
      else {
        const taskRows = await sql`
          INSERT INTO public.execution_tasks(
            user_id,decision_request_id,user_decision_id,action_type,amount,currency,instructions,evidence_requirement,status
          ) VALUES(
            ${input.userId}::uuid,${input.decisionRequestId}::uuid,${String(userDecision.id)}::uuid,${String(request.decision_type)},
            ${request.requested_amount ?? null},'SAR','نفّذ القرار المعتمد خارجيًا، ثم أكد التنفيذ وأرفق الإثبات. منصة نماء لا تنفذ العملية نيابةً عنك.',
            'REQUIRED','USER_ACTION_REQUEST'
          ) RETURNING id,status,action_type,amount,currency,evidence_requirement,required_by
        `;
        task = taskRows[0] ?? null;
      }
    }

    return { userDecision, requestStatus: target, executionTask: task };
  } catch (error) {
    throw mapFinancialDatabaseError(error);
  }
}
