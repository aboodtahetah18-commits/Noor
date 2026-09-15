import { getRawSql, type RawSqlClient, type SqlRow, type SqlRows } from '@/infrastructure/db/client';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GovernanceActionOwner = 'SYSTEM' | 'USER' | 'GOVERNANCE' | 'BANK_ENGINE' | string;

export type GovernanceCaseContract = {
  caseId: string;
  caseType: string;
  subject: string;
  priority: number;
  caseVersion: number;
  currentStatus: string;
  correlationId: string;
  nextActionCode: string | null;
  actionOwner: GovernanceActionOwner | null;
  actionContext: Record<string, unknown> | null;
  readinessStatus: string | null;
  readinessScore: string | null;
  optionGenerationStatus: string | null;
  generatedCount: number | null;
  rankingStatus: string | null;
  rankedCount: number | null;
  decisionId: string | null;
  decisionStatus: string | null;
  decisionRequestStatus: string | null;
  userDecisionAction: string | null;
  userDecisionStatus: string | null;
  executionTaskStatus: string | null;
  latestExecutionStatus: string | null;
  pendingEvidenceCount: number;
  matchedEvidenceCount: number;
  monitoringStatus: string | null;
  highestSeverity: string | null;
  outcomeStatus: string | null;
  settlementStatus: string | null;
  learningReviewStatus: string | null;
  readyToClose: boolean;
  closureBlockers: unknown[];
  apiPayload: Record<string, unknown>;
  updatedAt: string;
};

type GovernanceCaseRow = SqlRow & {
  case_id: string;
  case_type: string;
  subject: string;
  priority: number;
  case_version: number;
  current_status: string;
  correlation_id: string;
  next_action_code: string | null;
  action_owner: string | null;
  action_context: Record<string, unknown> | null;
  readiness_status: string | null;
  readiness_score: string | null;
  option_generation_status: string | null;
  generated_count: number | null;
  ranking_status: string | null;
  ranked_count: number | null;
  decision_id: string | null;
  decision_status: string | null;
  decision_request_status: string | null;
  user_decision_action: string | null;
  user_decision_status: string | null;
  execution_task_status: string | null;
  latest_execution_status: string | null;
  pending_evidence_count: string | number | null;
  matched_evidence_count: string | number | null;
  monitoring_status: string | null;
  highest_severity: string | null;
  outcome_status: string | null;
  settlement_status: string | null;
  learning_review_status: string | null;
  ready_to_close: boolean | null;
  closure_blockers: unknown[] | null;
  api_payload: Record<string, unknown> | null;
  updated_at: string | Date;
};

function assertUuid(value: string, field: string): void {
  if (!UUID_PATTERN.test(value)) throw new Error(`INVALID_${field.toUpperCase()}`);
}

function toContract(row: GovernanceCaseRow): GovernanceCaseContract {
  return {
    caseId: row.case_id,
    caseType: row.case_type,
    subject: row.subject,
    priority: Number(row.priority),
    caseVersion: Number(row.case_version),
    currentStatus: row.current_status,
    correlationId: row.correlation_id,
    nextActionCode: row.next_action_code,
    actionOwner: row.action_owner,
    actionContext: row.action_context,
    readinessStatus: row.readiness_status,
    readinessScore: row.readiness_score == null ? null : String(row.readiness_score),
    optionGenerationStatus: row.option_generation_status,
    generatedCount: row.generated_count == null ? null : Number(row.generated_count),
    rankingStatus: row.ranking_status,
    rankedCount: row.ranked_count == null ? null : Number(row.ranked_count),
    decisionId: row.decision_id,
    decisionStatus: row.decision_status,
    decisionRequestStatus: row.decision_request_status,
    userDecisionAction: row.user_decision_action,
    userDecisionStatus: row.user_decision_status,
    executionTaskStatus: row.execution_task_status,
    latestExecutionStatus: row.latest_execution_status,
    pendingEvidenceCount: Number(row.pending_evidence_count ?? 0),
    matchedEvidenceCount: Number(row.matched_evidence_count ?? 0),
    monitoringStatus: row.monitoring_status,
    highestSeverity: row.highest_severity,
    outcomeStatus: row.outcome_status,
    settlementStatus: row.settlement_status,
    learningReviewStatus: row.learning_review_status,
    readyToClose: Boolean(row.ready_to_close),
    closureBlockers: Array.isArray(row.closure_blockers) ? row.closure_blockers : [],
    apiPayload: row.api_payload ?? {},
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

async function runWithGovernanceUser(
  userId: string,
  buildQuery: (sql: RawSqlClient) => Promise<SqlRows>,
): Promise<SqlRows> {
  assertUuid(userId, 'user_id');
  const sql = getRawSql();
  const [, rows] = await sql.transaction([
    sql`select set_config('app.current_user_id', ${userId}, true)`,
    buildQuery(sql),
  ]);
  return rows ?? [];
}

export async function listGovernanceCaseContracts(
  userId: string,
  limit = 50,
): Promise<GovernanceCaseContract[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const rows = await runWithGovernanceUser(userId, (sql) => sql`
    select
      contract.case_id,
      c.case_type,
      c.subject,
      c.priority,
      contract.case_version,
      contract.current_status,
      contract.correlation_id,
      contract.next_action_code,
      contract.action_owner,
      contract.action_context,
      contract.readiness_status,
      contract.readiness_score,
      contract.option_generation_status,
      contract.generated_count,
      contract.ranking_status,
      contract.ranked_count,
      contract.decision_id,
      contract.decision_status,
      contract.decision_request_status,
      contract.user_decision_action,
      contract.user_decision_status,
      contract.execution_task_status,
      contract.latest_execution_status,
      contract.pending_evidence_count,
      contract.matched_evidence_count,
      contract.monitoring_status,
      contract.highest_severity,
      contract.outcome_status,
      contract.settlement_status,
      contract.learning_review_status,
      contract.ready_to_close,
      contract.closure_blockers,
      contract.api_payload,
      c.updated_at
    from governance.case_api_contract contract
    join governance.cases c
      on c.id = contract.case_id
     and c.user_id = contract.user_id
    where contract.user_id = ${userId}::uuid
    order by c.priority desc, c.updated_at desc
    limit ${safeLimit}
  `);
  return (rows as GovernanceCaseRow[]).map(toContract);
}

export async function getGovernanceCaseContract(
  userId: string,
  caseId: string,
): Promise<GovernanceCaseContract | null> {
  assertUuid(caseId, 'case_id');
  const rows = await runWithGovernanceUser(userId, (sql) => sql`
    select
      contract.case_id,
      c.case_type,
      c.subject,
      c.priority,
      contract.case_version,
      contract.current_status,
      contract.correlation_id,
      contract.next_action_code,
      contract.action_owner,
      contract.action_context,
      contract.readiness_status,
      contract.readiness_score,
      contract.option_generation_status,
      contract.generated_count,
      contract.ranking_status,
      contract.ranked_count,
      contract.decision_id,
      contract.decision_status,
      contract.decision_request_status,
      contract.user_decision_action,
      contract.user_decision_status,
      contract.execution_task_status,
      contract.latest_execution_status,
      contract.pending_evidence_count,
      contract.matched_evidence_count,
      contract.monitoring_status,
      contract.highest_severity,
      contract.outcome_status,
      contract.settlement_status,
      contract.learning_review_status,
      contract.ready_to_close,
      contract.closure_blockers,
      contract.api_payload,
      c.updated_at
    from governance.case_api_contract contract
    join governance.cases c
      on c.id = contract.case_id
     and c.user_id = contract.user_id
    where contract.user_id = ${userId}::uuid
      and contract.case_id = ${caseId}::uuid
    limit 1
  `);
  return rows[0] ? toContract(rows[0] as GovernanceCaseRow) : null;
}
