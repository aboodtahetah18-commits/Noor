import { getRawSql } from '@/infrastructure/db/client';

export type PilotFollowupCheckpointCode = 'IMMEDIATE' | 'DAY_30' | 'DAY_90' | 'CYCLE_END';
export type PilotFollowupDirection = 'IMPROVED' | 'NEUTRAL' | 'DETERIORATED' | 'PENDING';

export type PilotFollowupCheckpoint = {
  code: PilotFollowupCheckpointCode;
  targetAt: string;
  snapshotId: string | null;
  snapshotCycleId: string | null;
  asOfAt: string | null;
  actualLiquidity: string | null;
  freeCashAmount: string | null;
  protectionDeficit: string | null;
  weightedScore: string | null;
  finalState: string | null;
  actualLiquidityDelta: string | null;
  freeCashDelta: string | null;
  protectionDeficitDelta: string | null;
  weightedScoreDelta: string | null;
  direction: PilotFollowupDirection;
};

export type PilotLongitudinalFollowup = {
  recommendationId: string;
  cycleId: string;
  cycleName: string;
  title: string;
  executionEventId: string;
  executedAt: string;
  cycleBoundaryAt: string;
  baselineSnapshotId: string | null;
  baselineActualLiquidity: string | null;
  baselineFreeCashAmount: string | null;
  baselineProtectionDeficit: string | null;
  baselineWeightedScore: string | null;
  baselineFinalState: string | null;
  checkpoints: PilotFollowupCheckpoint[];
};

function nullableString(value: unknown): string | null {
  return value == null ? null : String(value);
}

function finiteNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function delta(after: unknown, before: unknown): string | null {
  const afterNumber = finiteNumber(after);
  const beforeNumber = finiteNumber(before);
  if (afterNumber == null || beforeNumber == null) return null;
  return String(afterNumber - beforeNumber);
}

function classify(input: {
  snapshotId: string | null;
  scoreDelta: string | null;
  freeCashDelta: string | null;
  protectionDeficitDelta: string | null;
}): PilotFollowupDirection {
  if (!input.snapshotId) return 'PENDING';

  let positive = 0;
  let negative = 0;
  const scoreDelta = finiteNumber(input.scoreDelta);
  const freeCashDelta = finiteNumber(input.freeCashDelta);
  const protectionDelta = finiteNumber(input.protectionDeficitDelta);

  if (scoreDelta != null && Math.abs(scoreDelta) >= 0.5) {
    if (scoreDelta > 0) positive += 1;
    else negative += 1;
  }
  if (freeCashDelta != null && Math.abs(freeCashDelta) >= 0.01) {
    if (freeCashDelta > 0) positive += 1;
    else negative += 1;
  }
  if (protectionDelta != null && Math.abs(protectionDelta) >= 0.01) {
    if (protectionDelta < 0) positive += 1;
    else negative += 1;
  }

  if (positive > negative) return 'IMPROVED';
  if (negative > positive) return 'DETERIORATED';
  return 'NEUTRAL';
}

export async function getPilotLongitudinalFollowups(
  userId: string,
  startsAt: string,
  endsAt: string,
): Promise<PilotLongitudinalFollowup[]> {
  const sql = getRawSql();
  const rows = await sql`
    WITH verified AS (
      SELECT
        r.id AS recommendation_id,
        r.cycle_id,
        c.name AS cycle_name,
        c.expected_next_income_date,
        r.title,
        dr.data_snapshot_id,
        e.id AS execution_event_id,
        COALESCE(e.executed_at, e.created_at) AS execution_at,
        base_snapshot.id AS baseline_snapshot_id,
        base_snapshot.actual_liquidity AS baseline_actual_liquidity,
        base_snapshot.free_cash_amount AS baseline_free_cash_amount,
        base_snapshot.protection_deficit AS baseline_protection_deficit,
        base_assessment.weighted_score AS baseline_weighted_score,
        COALESCE(base_assessment.final_state, base_snapshot.state) AS baseline_final_state
      FROM public.recommendations r
      JOIN public.financial_cycles c
        ON c.id = r.cycle_id
        AND c.user_id = r.user_id
      JOIN public.decision_requests dr
        ON dr.recommendation_id = r.id
        AND dr.user_id = r.user_id
      JOIN public.execution_tasks t
        ON t.decision_request_id = dr.id
        AND t.user_id = r.user_id
      JOIN public.execution_events e
        ON e.execution_task_id = t.id
        AND e.user_id = r.user_id
        AND e.status = 'VERIFIED_EXECUTION'
      LEFT JOIN public.cycle_financial_engine_snapshots base_snapshot
        ON base_snapshot.id::text = dr.data_snapshot_id::text
        AND base_snapshot.user_id = r.user_id
      LEFT JOIN LATERAL (
        SELECT assessment.*
        FROM public.cycle_financial_score_assessments assessment
        WHERE assessment.user_id = r.user_id
          AND assessment.engine_snapshot_id = base_snapshot.id
        ORDER BY assessment.assessed_at DESC, assessment.assessment_version DESC
        LIMIT 1
      ) base_assessment ON true
      WHERE r.user_id = ${userId}::uuid
        AND c.start_date >= ${startsAt}::date
        AND c.start_date <= ${endsAt}::date
    )
    SELECT
      v.*,
      checkpoints.code,
      checkpoints.target_at,
      snapshot.id AS checkpoint_snapshot_id,
      snapshot.cycle_id AS checkpoint_cycle_id,
      snapshot.as_of_at AS checkpoint_as_of_at,
      snapshot.actual_liquidity AS checkpoint_actual_liquidity,
      snapshot.free_cash_amount AS checkpoint_free_cash_amount,
      snapshot.protection_deficit AS checkpoint_protection_deficit,
      assessment.weighted_score AS checkpoint_weighted_score,
      COALESCE(assessment.final_state, snapshot.state) AS checkpoint_final_state
    FROM verified v
    CROSS JOIN LATERAL (
      VALUES
        ('IMMEDIATE'::text, v.execution_at),
        ('DAY_30'::text, v.execution_at + interval '30 days'),
        ('DAY_90'::text, v.execution_at + interval '90 days'),
        (
          'CYCLE_END'::text,
          GREATEST(v.execution_at, v.expected_next_income_date::timestamp)
        )
    ) AS checkpoints(code, target_at)
    LEFT JOIN LATERAL (
      SELECT candidate.*
      FROM public.cycle_financial_engine_snapshots candidate
      WHERE candidate.user_id = ${userId}::uuid
        AND candidate.as_of_at >= checkpoints.target_at
        AND candidate.as_of_at <= ${endsAt}::date + interval '1 day'
      ORDER BY candidate.as_of_at ASC
      LIMIT 1
    ) snapshot ON true
    LEFT JOIN LATERAL (
      SELECT score.*
      FROM public.cycle_financial_score_assessments score
      WHERE score.user_id = ${userId}::uuid
        AND score.engine_snapshot_id = snapshot.id
      ORDER BY score.assessed_at DESC, score.assessment_version DESC
      LIMIT 1
    ) assessment ON true
    ORDER BY v.execution_at DESC,
      CASE checkpoints.code
        WHEN 'IMMEDIATE' THEN 1
        WHEN 'DAY_30' THEN 2
        WHEN 'DAY_90' THEN 3
        ELSE 4
      END
  `;

  const grouped = new Map<string, PilotLongitudinalFollowup>();

  for (const row of rows) {
    const recommendationId = String(row.recommendation_id);
    let item = grouped.get(recommendationId);
    if (!item) {
      item = {
        recommendationId,
        cycleId: String(row.cycle_id),
        cycleName: String(row.cycle_name),
        title: String(row.title),
        executionEventId: String(row.execution_event_id),
        executedAt: String(row.execution_at),
        cycleBoundaryAt: String(row.expected_next_income_date),
        baselineSnapshotId: nullableString(row.baseline_snapshot_id),
        baselineActualLiquidity: nullableString(row.baseline_actual_liquidity),
        baselineFreeCashAmount: nullableString(row.baseline_free_cash_amount),
        baselineProtectionDeficit: nullableString(row.baseline_protection_deficit),
        baselineWeightedScore: nullableString(row.baseline_weighted_score),
        baselineFinalState: nullableString(row.baseline_final_state),
        checkpoints: [],
      };
      grouped.set(recommendationId, item);
    }

    const snapshotId = nullableString(row.checkpoint_snapshot_id);
    const actualLiquidityDelta = delta(row.checkpoint_actual_liquidity, row.baseline_actual_liquidity);
    const freeCashDelta = delta(row.checkpoint_free_cash_amount, row.baseline_free_cash_amount);
    const protectionDeficitDelta = delta(row.checkpoint_protection_deficit, row.baseline_protection_deficit);
    const weightedScoreDelta = delta(row.checkpoint_weighted_score, row.baseline_weighted_score);

    item.checkpoints.push({
      code: String(row.code) as PilotFollowupCheckpointCode,
      targetAt: String(row.target_at),
      snapshotId,
      snapshotCycleId: nullableString(row.checkpoint_cycle_id),
      asOfAt: nullableString(row.checkpoint_as_of_at),
      actualLiquidity: nullableString(row.checkpoint_actual_liquidity),
      freeCashAmount: nullableString(row.checkpoint_free_cash_amount),
      protectionDeficit: nullableString(row.checkpoint_protection_deficit),
      weightedScore: nullableString(row.checkpoint_weighted_score),
      finalState: nullableString(row.checkpoint_final_state),
      actualLiquidityDelta,
      freeCashDelta,
      protectionDeficitDelta,
      weightedScoreDelta,
      direction: classify({ snapshotId, scoreDelta: weightedScoreDelta, freeCashDelta, protectionDeficitDelta }),
    });
  }

  return [...grouped.values()];
}
