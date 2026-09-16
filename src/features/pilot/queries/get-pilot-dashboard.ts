import { getRawSql } from '@/infrastructure/db/client';

export type PilotCycleRow = {
  cycleId: string;
  name: string;
  startDate: string;
  expectedNextIncomeDate: string;
  status: string;
  snapshotId: string | null;
  asOfAt: string | null;
  actualLiquidity: string | null;
  freeCashAmount: string | null;
  protectionDeficit: string | null;
  projectedEndBalance: string | null;
  weightedScore: string | null;
  finalState: string | null;
  confidenceScore: string | null;
  dataCoverageBps: number | null;
  recommendationReadiness: string | null;
  hardGateCode: string | null;
};

export type PilotDashboardData = {
  cycles: PilotCycleRow[];
  totalCycles: number;
  cyclesWithEngineState: number;
  cyclesWithScore: number;
  cyclesWithHardGate: number;
  latest: PilotCycleRow | null;
};

function nullableString(value: unknown): string | null {
  return value == null ? null : String(value);
}

export async function getPilotDashboard(
  userId: string,
  startsAt: string,
  endsAt: string,
): Promise<PilotDashboardData> {
  const sql = getRawSql();
  const rows = await sql`
    SELECT
      c.id AS cycle_id,
      c.name,
      c.start_date::text,
      c.expected_next_income_date::text,
      c.status,
      s.id AS snapshot_id,
      s.as_of_at,
      s.actual_liquidity,
      s.free_cash_amount,
      s.protection_deficit,
      s.projected_end_balance,
      a.weighted_score,
      COALESCE(a.final_state, s.state) AS final_state,
      COALESCE(a.confidence_score, s.confidence_score) AS confidence_score,
      a.data_coverage_bps,
      a.recommendation_readiness,
      a.hard_gate_code
    FROM public.financial_cycles c
    LEFT JOIN LATERAL (
      SELECT current_state.*
      FROM public.cycle_financial_engine_current_v current_state
      WHERE current_state.user_id = c.user_id
        AND current_state.cycle_id = c.id
      ORDER BY current_state.as_of_at DESC
      LIMIT 1
    ) s ON true
    LEFT JOIN LATERAL (
      SELECT assessment.*
      FROM public.cycle_financial_score_assessments assessment
      WHERE assessment.user_id = c.user_id
        AND assessment.cycle_id = c.id
        AND assessment.engine_snapshot_id = s.id
      ORDER BY assessment.assessed_at DESC, assessment.assessment_version DESC
      LIMIT 1
    ) a ON true
    WHERE c.user_id = ${userId}::uuid
      AND c.start_date >= ${startsAt}::date
      AND c.start_date <= ${endsAt}::date
    ORDER BY c.start_date DESC, c.created_at DESC
  `;

  const cycles: PilotCycleRow[] = rows.map((row) => ({
    cycleId: String(row.cycle_id),
    name: String(row.name),
    startDate: String(row.start_date),
    expectedNextIncomeDate: String(row.expected_next_income_date),
    status: String(row.status),
    snapshotId: nullableString(row.snapshot_id),
    asOfAt: nullableString(row.as_of_at),
    actualLiquidity: nullableString(row.actual_liquidity),
    freeCashAmount: nullableString(row.free_cash_amount),
    protectionDeficit: nullableString(row.protection_deficit),
    projectedEndBalance: nullableString(row.projected_end_balance),
    weightedScore: nullableString(row.weighted_score),
    finalState: nullableString(row.final_state),
    confidenceScore: nullableString(row.confidence_score),
    dataCoverageBps: row.data_coverage_bps == null ? null : Number(row.data_coverage_bps),
    recommendationReadiness: nullableString(row.recommendation_readiness),
    hardGateCode: nullableString(row.hard_gate_code),
  }));

  return {
    cycles,
    totalCycles: cycles.length,
    cyclesWithEngineState: cycles.filter((cycle) => cycle.snapshotId !== null).length,
    cyclesWithScore: cycles.filter((cycle) => cycle.weightedScore !== null).length,
    cyclesWithHardGate: cycles.filter((cycle) => cycle.hardGateCode !== null).length,
    latest: cycles[0] ?? null,
  };
}
