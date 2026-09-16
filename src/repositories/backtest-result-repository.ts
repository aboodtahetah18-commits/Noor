import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { evaluateBacktestResult, type BacktestResultInput } from '@/financial-engine';

export interface CompleteBacktestRequestInput {
  userId: string;
  requestId: string;
  proposalId: string;
  result: BacktestResultInput;
}

export interface CompletedBacktestResult {
  runId: string;
  approvalAllowed: boolean;
  outcome: string;
}

export class BacktestResultRepository {
  async completeRequest(input: CompleteBacktestRequestInput): Promise<CompletedBacktestResult> {
    const governance = evaluateBacktestResult(input.result);
    if (!governance.valid) {
      throw new Error(`BACKTEST_RESULT_INVALID:${governance.blockers.join(',')}`);
    }

    const sql = getRawSql();
    const runId = randomUUID();
    const metricsJson = JSON.stringify(input.result.metrics);
    const evidenceJson = JSON.stringify(input.result.evidence);

    const [, requestRows, runRows, updateRows] = await sql.transaction([
      sql`select set_config('app.current_user_id', ${input.userId}, true)`,
      sql`
        select id::text as id
        from public.algorithm_backtest_requests
        where id=${input.requestId}::uuid
          and user_id=${input.userId}::uuid
          and proposal_id=${input.proposalId}::uuid
          and baseline_version=${input.result.baselineVersion}
          and candidate_version=${input.result.candidateVersion}
          and status='PENDING'
          and backtest_run_id is null
        for update
      `,
      sql`
        insert into public.algorithm_backtest_runs
          (id,user_id,proposal_id,baseline_version,candidate_version,dataset_starts_at,dataset_ends_at,outcome,metrics_json,evidence_json,notes,completed_at)
        select
          ${runId}::uuid,
          r.user_id,
          r.proposal_id,
          r.baseline_version,
          r.candidate_version,
          ${input.result.datasetStartsAt}::date,
          ${input.result.datasetEndsAt}::date,
          ${input.result.outcome},
          ${metricsJson}::jsonb,
          ${evidenceJson}::jsonb,
          ${input.result.notes ?? null},
          ${input.result.completedAt}::timestamptz
        from public.algorithm_backtest_requests r
        where r.id=${input.requestId}::uuid
          and r.user_id=${input.userId}::uuid
          and r.proposal_id=${input.proposalId}::uuid
          and r.baseline_version=${input.result.baselineVersion}
          and r.candidate_version=${input.result.candidateVersion}
          and r.status='PENDING'
          and r.backtest_run_id is null
        returning id::text as id
      `,
      sql`
        update public.algorithm_backtest_requests
        set status='COMPLETED', backtest_run_id=${runId}::uuid, completed_at=${input.result.completedAt}::timestamptz
        where id=${input.requestId}::uuid
          and user_id=${input.userId}::uuid
          and proposal_id=${input.proposalId}::uuid
          and status='PENDING'
          and backtest_run_id is null
        returning id::text as id
      `,
    ]);

    if (!requestRows?.[0] || !runRows?.[0] || !updateRows?.[0]) {
      throw new Error('BACKTEST_REQUEST_COMPLETION_GATE_FAILED');
    }

    return {
      runId,
      approvalAllowed: governance.approvalAllowed,
      outcome: input.result.outcome,
    };
  }
}

export const backtestResultRepository = new BacktestResultRepository();
