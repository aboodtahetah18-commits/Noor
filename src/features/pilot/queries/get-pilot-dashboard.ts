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

export type PilotDecisionTrace = {
  recommendationId: string;
  cycleId: string;
  cycleName: string;
  title: string;
  reasonCode: string;
  recommendationStatus: string;
  recommendationCreatedAt: string;
  decisionRequestId: string | null;
  decisionRequestStatus: string | null;
  requestedAmount: string | null;
  materiality: string | null;
  userDecisionId: string | null;
  userDecisionAction: string | null;
  userDecisionStatus: string | null;
  decidedAt: string | null;
  executionTaskId: string | null;
  executionTaskStatus: string | null;
  executionAmount: string | null;
  executionCurrency: string | null;
  executionEventId: string | null;
  executionEventStatus: string | null;
  reportedAmount: string | null;
  executedAt: string | null;
  executionReportedAt: string | null;
  evidenceCaseId: string | null;
  evidenceVerificationStatus: string | null;
  verifiedExecution: boolean;
};

export type PilotDashboardData = {
  cycles: PilotCycleRow[];
  decisions: PilotDecisionTrace[];
  totalCycles: number;
  cyclesWithEngineState: number;
  cyclesWithScore: number;
  cyclesWithHardGate: number;
  totalRecommendations: number;
  recommendationsWithDecisionRequest: number;
  userApprovedDecisions: number;
  executionTasksCreated: number;
  executionReportsReceived: number;
  verifiedExecutions: number;
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

  const decisionRows = await sql`
    SELECT
      r.id AS recommendation_id,
      r.cycle_id,
      c.name AS cycle_name,
      r.title,
      r.reason_code,
      r.status AS recommendation_status,
      r.created_at AS recommendation_created_at,
      dr.id AS decision_request_id,
      dr.status AS decision_request_status,
      dr.requested_amount,
      dr.materiality,
      ud.id AS user_decision_id,
      ud.action AS user_decision_action,
      ud.status AS user_decision_status,
      ud.decided_at,
      t.id AS execution_task_id,
      t.status AS execution_task_status,
      t.amount AS execution_amount,
      t.currency AS execution_currency,
      e.id AS execution_event_id,
      e.status AS execution_event_status,
      e.reported_amount,
      e.executed_at,
      e.created_at AS execution_reported_at,
      ec.id AS evidence_case_id,
      ec.verification_status AS evidence_verification_status
    FROM public.recommendations r
    JOIN public.financial_cycles c
      ON c.id = r.cycle_id
      AND c.user_id = r.user_id
    LEFT JOIN LATERAL (
      SELECT request.*
      FROM public.decision_requests request
      WHERE request.user_id = r.user_id
        AND request.recommendation_id = r.id
      ORDER BY request.created_at DESC
      LIMIT 1
    ) dr ON true
    LEFT JOIN LATERAL (
      SELECT decision.*
      FROM public.user_decisions decision
      WHERE decision.user_id = r.user_id
        AND decision.decision_request_id = dr.id
      ORDER BY decision.decided_at DESC
      LIMIT 1
    ) ud ON true
    LEFT JOIN LATERAL (
      SELECT task.*
      FROM public.execution_tasks task
      WHERE task.user_id = r.user_id
        AND task.decision_request_id = dr.id
      ORDER BY task.created_at DESC
      LIMIT 1
    ) t ON true
    LEFT JOIN LATERAL (
      SELECT event.*
      FROM public.execution_events event
      WHERE event.user_id = r.user_id
        AND event.execution_task_id = t.id
      ORDER BY event.created_at DESC
      LIMIT 1
    ) e ON true
    LEFT JOIN LATERAL (
      SELECT evidence.*
      FROM public.evidence_cases evidence
      WHERE evidence.user_id = r.user_id
        AND evidence.execution_event_id = e.id
      ORDER BY evidence.created_at DESC
      LIMIT 1
    ) ec ON true
    WHERE r.user_id = ${userId}::uuid
      AND c.start_date >= ${startsAt}::date
      AND c.start_date <= ${endsAt}::date
    ORDER BY r.created_at DESC
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

  const decisions: PilotDecisionTrace[] = decisionRows.map((row) => ({
    recommendationId: String(row.recommendation_id),
    cycleId: String(row.cycle_id),
    cycleName: String(row.cycle_name),
    title: String(row.title),
    reasonCode: String(row.reason_code),
    recommendationStatus: String(row.recommendation_status),
    recommendationCreatedAt: String(row.recommendation_created_at),
    decisionRequestId: nullableString(row.decision_request_id),
    decisionRequestStatus: nullableString(row.decision_request_status),
    requestedAmount: nullableString(row.requested_amount),
    materiality: nullableString(row.materiality),
    userDecisionId: nullableString(row.user_decision_id),
    userDecisionAction: nullableString(row.user_decision_action),
    userDecisionStatus: nullableString(row.user_decision_status),
    decidedAt: nullableString(row.decided_at),
    executionTaskId: nullableString(row.execution_task_id),
    executionTaskStatus: nullableString(row.execution_task_status),
    executionAmount: nullableString(row.execution_amount),
    executionCurrency: nullableString(row.execution_currency)?.trim() ?? null,
    executionEventId: nullableString(row.execution_event_id),
    executionEventStatus: nullableString(row.execution_event_status),
    reportedAmount: nullableString(row.reported_amount),
    executedAt: nullableString(row.executed_at),
    executionReportedAt: nullableString(row.execution_reported_at),
    evidenceCaseId: nullableString(row.evidence_case_id),
    evidenceVerificationStatus: nullableString(row.evidence_verification_status),
    verifiedExecution: String(row.execution_event_status ?? '') === 'VERIFIED_EXECUTION',
  }));

  return {
    cycles,
    decisions,
    totalCycles: cycles.length,
    cyclesWithEngineState: cycles.filter((cycle) => cycle.snapshotId !== null).length,
    cyclesWithScore: cycles.filter((cycle) => cycle.weightedScore !== null).length,
    cyclesWithHardGate: cycles.filter((cycle) => cycle.hardGateCode !== null).length,
    totalRecommendations: decisions.length,
    recommendationsWithDecisionRequest: decisions.filter((item) => item.decisionRequestId !== null).length,
    userApprovedDecisions: decisions.filter((item) => item.userDecisionAction === 'APPROVE').length,
    executionTasksCreated: decisions.filter((item) => item.executionTaskId !== null).length,
    executionReportsReceived: decisions.filter((item) => item.executionEventId !== null).length,
    verifiedExecutions: decisions.filter((item) => item.verifiedExecution).length,
    latest: cycles[0] ?? null,
  };
}
