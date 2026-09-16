import { getRawSql } from '@/infrastructure/db/client';

export type PilotImpactDirection = 'IMPROVED' | 'NEUTRAL' | 'DETERIORATED' | 'PENDING_POST_SNAPSHOT';

export type PilotExpectedSignal = {
  expectedSummary: string | null;
  expectedReturnPct: string | null;
  expectedEndBalance: string | null;
  targetScore: string | null;
  upsidePct: string | null;
  downsidePct: string | null;
};

export type PilotImpactRow = {
  recommendationId: string;
  cycleId: string;
  cycleName: string;
  title: string;
  reasonCode: string;
  decisionRequestId: string;
  executionEventId: string;
  executedAt: string | null;
  executionReportedAt: string;
  baselineSnapshotId: string | null;
  baselineAsOfAt: string | null;
  baselineActualLiquidity: string | null;
  baselineFreeCashAmount: string | null;
  baselineProtectionDeficit: string | null;
  baselineProjectedEndBalance: string | null;
  baselineWeightedScore: string | null;
  baselineFinalState: string | null;
  postSnapshotId: string | null;
  postAsOfAt: string | null;
  postActualLiquidity: string | null;
  postFreeCashAmount: string | null;
  postProtectionDeficit: string | null;
  postProjectedEndBalance: string | null;
  postWeightedScore: string | null;
  postFinalState: string | null;
  actualLiquidityDelta: string | null;
  freeCashDelta: string | null;
  protectionDeficitDelta: string | null;
  weightedScoreDelta: string | null;
  expected: PilotExpectedSignal;
  hasExplicitNumericExpectation: boolean;
  direction: PilotImpactDirection;
  positiveSignals: number;
  negativeSignals: number;
};

function nullableString(value: unknown): string | null {
  return value == null ? null : String(value);
}

function finiteNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function numericString(value: unknown): string | null {
  const n = finiteNumber(value);
  return n == null ? null : String(n);
}

function firstString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = numericString(source[key]);
    if (value != null) return value;
  }
  return null;
}

function delta(after: unknown, before: unknown): string | null {
  const a = finiteNumber(after);
  const b = finiteNumber(before);
  return a == null || b == null ? null : String(a - b);
}

function classifyImpact(input: {
  postSnapshotId: string | null;
  scoreDelta: string | null;
  freeCashDelta: string | null;
  protectionDeficitDelta: string | null;
}): { direction: PilotImpactDirection; positiveSignals: number; negativeSignals: number } {
  if (!input.postSnapshotId) return { direction: 'PENDING_POST_SNAPSHOT', positiveSignals: 0, negativeSignals: 0 };

  let positiveSignals = 0;
  let negativeSignals = 0;
  const score = finiteNumber(input.scoreDelta);
  const freeCash = finiteNumber(input.freeCashDelta);
  const protection = finiteNumber(input.protectionDeficitDelta);

  if (score != null && Math.abs(score) >= 0.5) score > 0 ? positiveSignals++ : negativeSignals++;
  if (freeCash != null && Math.abs(freeCash) >= 0.01) freeCash > 0 ? positiveSignals++ : negativeSignals++;
  if (protection != null && Math.abs(protection) >= 0.01) protection < 0 ? positiveSignals++ : negativeSignals++;

  const direction: PilotImpactDirection =
    positiveSignals > negativeSignals ? 'IMPROVED' : negativeSignals > positiveSignals ? 'DETERIORATED' : 'NEUTRAL';
  return { direction, positiveSignals, negativeSignals };
}

export async function getPilotImpacts(userId: string, startsAt: string, endsAt: string): Promise<PilotImpactRow[]> {
  const sql = getRawSql();
  const rows = await sql`
    SELECT
      r.id AS recommendation_id,
      r.cycle_id,
      c.name AS cycle_name,
      r.title,
      r.reason_code,
      r.reason_data,
      dr.id AS decision_request_id,
      dr.data_snapshot_id,
      e.id AS execution_event_id,
      e.executed_at,
      e.created_at AS execution_reported_at,
      base_snapshot.id AS baseline_snapshot_id,
      base_snapshot.as_of_at AS baseline_as_of_at,
      base_snapshot.actual_liquidity AS baseline_actual_liquidity,
      base_snapshot.free_cash_amount AS baseline_free_cash_amount,
      base_snapshot.protection_deficit AS baseline_protection_deficit,
      base_snapshot.projected_end_balance AS baseline_projected_end_balance,
      base_assessment.weighted_score AS baseline_weighted_score,
      COALESCE(base_assessment.final_state, base_snapshot.state) AS baseline_final_state,
      post_snapshot.id AS post_snapshot_id,
      post_snapshot.as_of_at AS post_as_of_at,
      post_snapshot.actual_liquidity AS post_actual_liquidity,
      post_snapshot.free_cash_amount AS post_free_cash_amount,
      post_snapshot.protection_deficit AS post_protection_deficit,
      post_snapshot.projected_end_balance AS post_projected_end_balance,
      post_assessment.weighted_score AS post_weighted_score,
      COALESCE(post_assessment.final_state, post_snapshot.state) AS post_final_state
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
      AND base_snapshot.cycle_id = r.cycle_id
    LEFT JOIN LATERAL (
      SELECT assessment.*
      FROM public.cycle_financial_score_assessments assessment
      WHERE assessment.user_id = r.user_id
        AND assessment.cycle_id = r.cycle_id
        AND assessment.engine_snapshot_id = base_snapshot.id
      ORDER BY assessment.assessed_at DESC, assessment.assessment_version DESC
      LIMIT 1
    ) base_assessment ON true
    LEFT JOIN LATERAL (
      SELECT snapshot.*
      FROM public.cycle_financial_engine_snapshots snapshot
      WHERE snapshot.user_id = r.user_id
        AND snapshot.cycle_id = r.cycle_id
        AND snapshot.is_stale = false
        AND snapshot.as_of_at > COALESCE(e.executed_at, e.created_at)
      ORDER BY snapshot.as_of_at ASC
      LIMIT 1
    ) post_snapshot ON true
    LEFT JOIN LATERAL (
      SELECT assessment.*
      FROM public.cycle_financial_score_assessments assessment
      WHERE assessment.user_id = r.user_id
        AND assessment.cycle_id = r.cycle_id
        AND assessment.engine_snapshot_id = post_snapshot.id
      ORDER BY assessment.assessed_at DESC, assessment.assessment_version DESC
      LIMIT 1
    ) post_assessment ON true
    WHERE r.user_id = ${userId}::uuid
      AND c.start_date >= ${startsAt}::date
      AND c.start_date <= ${endsAt}::date
    ORDER BY COALESCE(e.executed_at, e.created_at) DESC
  `;

  return rows.map((row) => {
    const reasonData = row.reason_data && typeof row.reason_data === 'object'
      ? row.reason_data as Record<string, unknown>
      : {};

    const expected: PilotExpectedSignal = {
      expectedSummary: firstString(reasonData, ['expected_outcome', 'expected_change', 'expectation', 'expected_impact']),
      expectedReturnPct: firstNumber(reasonData, ['expected_return_pct', 'expected_return_percent', 'expected_return_bps']),
      expectedEndBalance: firstNumber(reasonData, ['expected_end_balance', 'projected_end_balance', 'target_end_balance']),
      targetScore: firstNumber(reasonData, ['target_score', 'expected_score']),
      upsidePct: firstNumber(reasonData, ['upside_pct', 'upside_percent']),
      downsidePct: firstNumber(reasonData, ['downside_pct', 'downside_percent']),
    };

    const actualLiquidityDelta = delta(row.post_actual_liquidity, row.baseline_actual_liquidity);
    const freeCashDelta = delta(row.post_free_cash_amount, row.baseline_free_cash_amount);
    const protectionDeficitDelta = delta(row.post_protection_deficit, row.baseline_protection_deficit);
    const weightedScoreDelta = delta(row.post_weighted_score, row.baseline_weighted_score);
    const postSnapshotId = nullableString(row.post_snapshot_id);
    const impact = classifyImpact({
      postSnapshotId,
      scoreDelta: weightedScoreDelta,
      freeCashDelta,
      protectionDeficitDelta,
    });

    return {
      recommendationId: String(row.recommendation_id),
      cycleId: String(row.cycle_id),
      cycleName: String(row.cycle_name),
      title: String(row.title),
      reasonCode: String(row.reason_code),
      decisionRequestId: String(row.decision_request_id),
      executionEventId: String(row.execution_event_id),
      executedAt: nullableString(row.executed_at),
      executionReportedAt: String(row.execution_reported_at),
      baselineSnapshotId: nullableString(row.baseline_snapshot_id),
      baselineAsOfAt: nullableString(row.baseline_as_of_at),
      baselineActualLiquidity: nullableString(row.baseline_actual_liquidity),
      baselineFreeCashAmount: nullableString(row.baseline_free_cash_amount),
      baselineProtectionDeficit: nullableString(row.baseline_protection_deficit),
      baselineProjectedEndBalance: nullableString(row.baseline_projected_end_balance),
      baselineWeightedScore: nullableString(row.baseline_weighted_score),
      baselineFinalState: nullableString(row.baseline_final_state),
      postSnapshotId,
      postAsOfAt: nullableString(row.post_as_of_at),
      postActualLiquidity: nullableString(row.post_actual_liquidity),
      postFreeCashAmount: nullableString(row.post_free_cash_amount),
      postProtectionDeficit: nullableString(row.post_protection_deficit),
      postProjectedEndBalance: nullableString(row.post_projected_end_balance),
      postWeightedScore: nullableString(row.post_weighted_score),
      postFinalState: nullableString(row.post_final_state),
      actualLiquidityDelta,
      freeCashDelta,
      protectionDeficitDelta,
      weightedScoreDelta,
      expected,
      hasExplicitNumericExpectation: Object.values(expected).some((value) => value != null),
      direction: impact.direction,
      positiveSignals: impact.positiveSignals,
      negativeSignals: impact.negativeSignals,
    };
  });
}
