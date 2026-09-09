import { rawSql } from '@/infrastructure/db/client';
import { syncObligationStatuses } from '@/features/obligations/jobs/sync-obligation-statuses';
import { runRecommendationRules } from '@/features/recommendations/engine/run-recommendation-rules';
import { getDashboardSummary } from '@/features/dashboard/queries/get-dashboard-summary';
import { buildWeeklyAnalysisIdempotencyKey, getWeeklyPeriodStart } from './period';
import type { WeeklyAnalysisRunResult, WeeklyAnalysisRunStatus, WeeklyAnalysisSummary } from '../types/weekly-analysis';
import { getUserTimezone } from '@/features/settings/queries/get-user-timezone';

function rowResult(row: Record<string, unknown>, reused: boolean): WeeklyAnalysisRunResult {
  return {
    runId: String(row.id),
    idempotencyKey: String(row.idempotency_key),
    status: String(row.status) as WeeklyAnalysisRunStatus,
    reused,
    summary: row.summary ? (row.summary as WeeklyAnalysisSummary) : null,
    errorCode: row.error_code ? String(row.error_code) : null,
  };
}

async function reserveRun(userId: string, cycleId: string, periodStart: string): Promise<{ row: Record<string, unknown>; execute: boolean }> {
  const key = buildWeeklyAnalysisIdempotencyKey(userId, cycleId, periodStart);
  const inserted = await rawSql`insert into public.weekly_analysis_runs(user_id,cycle_id,period_start,idempotency_key,status,attempt_count,started_at)
    values(${userId},${cycleId}::uuid,${periodStart}::date,${key},'RUNNING',1,now())
    on conflict (user_id,idempotency_key) do nothing returning *`;
  if (inserted[0]) return { row: inserted[0] as Record<string, unknown>, execute: true };

  const existing = await rawSql`select * from public.weekly_analysis_runs where user_id=${userId} and idempotency_key=${key} limit 1`;
  const row = existing[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error('WEEKLY_ANALYSIS_RESERVATION_LOST');
  if (String(row.status) === 'SUCCESS' || String(row.status) === 'PARTIAL' || String(row.status) === 'RUNNING') {
    return { row, execute: false };
  }

  const retried = await rawSql`update public.weekly_analysis_runs set status='RUNNING',attempt_count=attempt_count+1,started_at=now(),finished_at=null,error_code=null
    where id=${String(row.id)}::uuid and user_id=${userId} and status='FAILED' returning *`;
  return retried[0]
    ? { row: retried[0] as Record<string, unknown>, execute: true }
    : { row, execute: false };
}

export async function runWeeklyAnalysisForCycle(userId: string, cycleId: string, now: Date = new Date()): Promise<WeeklyAnalysisRunResult> {
  const timezone = await getUserTimezone(userId);
  const periodStart = getWeeklyPeriodStart(now, timezone);
  const reservation = await reserveRun(userId, cycleId, periodStart);
  if (!reservation.execute) return rowResult(reservation.row, true);

  const runId = String(reservation.row.id);
  try {
    const obligationResult = await syncObligationStatuses(userId);
    const recommendationResult = await runRecommendationRules(userId, cycleId);
    const dashboard = await getDashboardSummary(userId, cycleId);
    const obligationTransitions = typeof obligationResult === 'number'
      ? obligationResult
      : Array.isArray(obligationResult) ? obligationResult.length : 0;

    const summary: WeeklyAnalysisSummary = {
      periodStart,
      cycleId,
      obligationTransitions,
      recommendationsCreated: recommendationResult.created,
      recommendationsResolved: recommendationResult.resolved,
      activeReasonCodes: recommendationResult.activeReasonCodes,
      blockedRules: recommendationResult.blockedRules,
      dashboardAvailable: Boolean(dashboard),
    };
    const status: WeeklyAnalysisRunStatus = recommendationResult.blockedRules.length > 0 ? 'PARTIAL' : 'SUCCESS';
    const rows = await rawSql`update public.weekly_analysis_runs set status=${status},summary=${JSON.stringify(summary)}::jsonb,finished_at=now(),error_code=null
      where id=${runId}::uuid and user_id=${userId} returning *`;
    return rowResult(rows[0] as Record<string, unknown>, false);
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.slice(0, 120) : 'WEEKLY_ANALYSIS_FAILED';
    await rawSql`update public.weekly_analysis_runs set status='FAILED',finished_at=now(),error_code=${errorCode} where id=${runId}::uuid and user_id=${userId}`;
    throw error;
  }
}

/** Scheduler entry point. V1 processes every operational cycle; it does not require a user session. */
export async function runWeeklyAnalysisJob(now: Date = new Date()): Promise<WeeklyAnalysisRunResult[]> {
  const cycles = await rawSql`select user_id::text,id::text from public.financial_cycles where status in ('ACTIVE','CLOSING') order by user_id,id`;
  const results: WeeklyAnalysisRunResult[] = [];
  for (const raw of cycles) {
    const row = raw as Record<string, unknown>;
    results.push(await runWeeklyAnalysisForCycle(String(row.user_id), String(row.id), now));
  }
  return results;
}
