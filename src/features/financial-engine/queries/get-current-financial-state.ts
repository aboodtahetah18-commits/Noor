import { getRawSql } from '@/infrastructure/db/client';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';

export type CurrentFinancialState = {
  cycleId: string;
  snapshotId: string;
  scoreAssessmentId: string | null;
  asOfAt: string;
  actualLiquidity: string;
  verifiedIncomeReceived: string;
  expectedIncomeUnreceived: string;
  openObligations: string;
  reservedObligations: string;
  requiredProtection: string;
  freeCashAmount: string;
  protectionDeficit: string;
  projectedEndBalance: string;
  projectedSurplus: string;
  projectedDeficit: string;
  weightedScore: string | null;
  finalState: string;
  confidenceScore: string | null;
  dataCoverageBps: number | null;
  recommendationReadiness: string | null;
  hardGateCode: string | null;
};

export async function getCurrentFinancialState(userId: string, cycleId: string): Promise<CurrentFinancialState> {
  const sql = getRawSql();
  const cycleRows = await sql`
    SELECT id
    FROM public.financial_cycles
    WHERE id=${cycleId}::uuid AND user_id=${userId}::uuid
    LIMIT 1
  `;
  if (cycleRows.length === 0) throw new FinancialPlatformError('FINANCIAL_CYCLE_NOT_FOUND', 404);

  const rows = await sql`
    SELECT
      s.cycle_id,
      s.id AS snapshot_id,
      s.as_of_at,
      s.actual_liquidity,
      s.verified_income_received,
      s.expected_income_unreceived,
      s.open_obligations,
      s.reserved_obligations,
      s.required_protection,
      s.free_cash_amount,
      s.protection_deficit,
      s.projected_end_balance,
      s.projected_surplus,
      s.projected_deficit,
      a.id AS score_assessment_id,
      a.weighted_score,
      COALESCE(a.final_state,s.state) AS final_state,
      COALESCE(a.confidence_score,s.confidence_score) AS confidence_score,
      a.data_coverage_bps,
      a.recommendation_readiness,
      a.hard_gate_code
    FROM public.cycle_financial_engine_current_v s
    LEFT JOIN LATERAL (
      SELECT a.*
      FROM public.cycle_financial_score_assessments a
      WHERE a.user_id=s.user_id
        AND a.cycle_id=s.cycle_id
        AND a.engine_snapshot_id=s.id
      ORDER BY a.assessed_at DESC,a.assessment_version DESC
      LIMIT 1
    ) a ON true
    WHERE s.user_id=${userId}::uuid
      AND s.cycle_id=${cycleId}::uuid
    ORDER BY s.as_of_at DESC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) throw new FinancialPlatformError('FINANCIAL_STATE_NOT_AVAILABLE', 404);

  return {
    cycleId: String(row.cycle_id),
    snapshotId: String(row.snapshot_id),
    scoreAssessmentId: row.score_assessment_id ? String(row.score_assessment_id) : null,
    asOfAt: String(row.as_of_at),
    actualLiquidity: String(row.actual_liquidity),
    verifiedIncomeReceived: String(row.verified_income_received),
    expectedIncomeUnreceived: String(row.expected_income_unreceived),
    openObligations: String(row.open_obligations),
    reservedObligations: String(row.reserved_obligations),
    requiredProtection: String(row.required_protection),
    freeCashAmount: String(row.free_cash_amount),
    protectionDeficit: String(row.protection_deficit),
    projectedEndBalance: String(row.projected_end_balance),
    projectedSurplus: String(row.projected_surplus),
    projectedDeficit: String(row.projected_deficit),
    weightedScore: row.weighted_score == null ? null : String(row.weighted_score),
    finalState: String(row.final_state),
    confidenceScore: row.confidence_score == null ? null : String(row.confidence_score),
    dataCoverageBps: row.data_coverage_bps == null ? null : Number(row.data_coverage_bps),
    recommendationReadiness: row.recommendation_readiness == null ? null : String(row.recommendation_readiness),
    hardGateCode: row.hard_gate_code == null ? null : String(row.hard_gate_code),
  };
}
