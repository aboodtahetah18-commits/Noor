import { rawSql } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import { calculateSavingRate } from '@/financial-engine/saving-rate';
import { calculatePercentage } from '@/financial-engine/percentage';
import type {
  DashboardSummary,
  DashboardCycleSummary,
  DashboardObligationSummary,
  DashboardRecommendationSummary,
  DashboardGoalSummary,
} from '@/features/dashboard/types/dashboard';
import type { FinancialCycleStatus, ObligationStatus, GoalStatus } from '@/domain/types';
import { emergencyRepository } from '@/repositories/emergency-repository';
import { goalRepository } from '@/repositories/goal-repository';
import { runRecommendationRules } from '@/features/recommendations/engine/run-recommendation-rules';
import { calculateCashForecast } from '@/features/cash-forecast/services/cash-forecast-service';

const MAX_UPCOMING_OBLIGATIONS = 5;
const MAX_GOALS = 4;

function nonNegative(value: Money): Money {
  return value.max(Money.zero());
}

function daysUntil(dateValue: string): number {
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const target = new Date(`${dateValue}T00:00:00Z`).getTime();
  return Math.max(0, Math.ceil((target - todayUtc) / 86_400_000));
}

function mapCycle(row: Record<string, unknown>, source: 'LIVE' | 'SNAPSHOT'): DashboardCycleSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    status: String(row.status) as FinancialCycleStatus,
    startDate: String(row.start_date),
    expectedNextIncomeDate: String(row.expected_next_income_date),
    remainingDays: daysUntil(String(row.expected_next_income_date)),
    source,
  };
}

export class DashboardRepository {
  private async resolveCycle(userId: string, cycleId?: string) {
    const rows = cycleId
      ? await rawSql`select id,name,status,start_date::text,expected_next_income_date::text from public.financial_cycles where id=${cycleId}::uuid and user_id=${userId} limit 1`
      : await rawSql`select id,name,status,start_date::text,expected_next_income_date::text from public.financial_cycles where user_id=${userId} and status in ('ACTIVE','CLOSING') order by case status when 'ACTIVE' then 1 else 2 end,created_at desc limit 1`;
    return rows[0] as Record<string, unknown> | undefined;
  }

  private async liveCore(userId: string, cycleId: string) {
    const [liquidityRows, incomeRows, budgetRows, savingRows, obligationRows, recommendationRows] = await Promise.all([
      rawSql`select coalesce(sum(v.balance),0)::text total from public.account_balances_v v where v.user_id=${userId}`,
      rawSql`select
        coalesce((select sum(e.expected_amount) from public.expected_incomes e where e.user_id=${userId} and e.cycle_id=${cycleId}::uuid),0)::text expected,
        coalesce((select sum(t.amount) from public.transactions t where t.user_id=${userId} and t.cycle_id=${cycleId}::uuid and t.transaction_type='INCOME' and t.status='POSTED'),0)::text actual`,
      rawSql`with current_plan as (
          select p.current_version_id
          from public.financial_plans p
          where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid and p.status in ('ACTIVE_PLAN','REVISED')
          limit 1
        ), planned as (
          select coalesce(sum(ba.planned_amount),0) amount
          from public.budget_allocations ba join current_plan cp on cp.current_version_id=ba.plan_version_id
          where ba.user_id=${userId}
        ), expense_actual as (
          select coalesce(sum(t.amount),0) amount
          from public.transactions t
          where t.user_id=${userId} and t.cycle_id=${cycleId}::uuid and t.transaction_type='EXPENSE' and t.status='POSTED'
        ), refunds as (
          select coalesce(sum(r.amount),0) amount
          from public.transactions r
          join public.transactions original on original.id=r.related_transaction_id and original.user_id=r.user_id
          where r.user_id=${userId} and r.cycle_id=${cycleId}::uuid and r.transaction_type='REFUND' and r.status='POSTED'
            and original.transaction_type='EXPENSE'
        ), obligations as (
          select coalesce(sum(t.amount),0) amount
          from public.transactions t
          where t.user_id=${userId} and t.cycle_id=${cycleId}::uuid and t.transaction_type='OBLIGATION_PAYMENT' and t.status='POSTED'
        )
        select planned.amount::text planned, greatest(expense_actual.amount-refunds.amount+obligations.amount,0)::text actual
        from planned,expense_actual,refunds,obligations`,
      rawSql`select
          coalesce(sa.planned_amount,0)::text planned,
          coalesce((select sum(st.amount) from public.saving_transfers st where st.user_id=${userId} and st.cycle_id=${cycleId}::uuid),0)::text actual
        from (select 1) seed
        left join public.saving_allocations sa on sa.user_id=${userId} and sa.cycle_id=${cycleId}::uuid
          and sa.plan_version_id=(select p.current_version_id from public.financial_plans p where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid and p.status in ('ACTIVE_PLAN','REVISED') limit 1)
        limit 1`,
      rawSql`select oo.id,ot.name,oo.amount::text,oo.due_date::text,oo.status,oo.is_reserved
        from public.obligation_occurrences oo
        join public.obligation_templates ot on ot.id=oo.template_id and ot.user_id=oo.user_id
        where oo.user_id=${userId} and oo.status in ('OVERDUE','DUE','UPCOMING')
          and (oo.cycle_id=${cycleId}::uuid or oo.cycle_id is null)
        order by case oo.status when 'OVERDUE' then 1 when 'DUE' then 2 else 3 end,oo.due_date,coalesce(ot.priority,2147483647)
        limit ${MAX_UPCOMING_OBLIGATIONS}`,
      rawSql`select id,recommendation_type,status,priority,title,message,reason_code
        from public.recommendations
        where user_id=${userId} and cycle_id=${cycleId}::uuid and status in ('NEW','VIEWED','ACCEPTED')
        order by priority asc,created_at desc
        limit 1`,
    ]);

    const income = incomeRows[0] as Record<string, unknown> | undefined;
    const budget = budgetRows[0] as Record<string, unknown> | undefined;
    const saving = savingRows[0] as Record<string, unknown> | undefined;
    const planned = Money.parse(String(budget?.planned ?? '0.00'));
    const actual = Money.parse(String(budget?.actual ?? '0.00'));
    const savingActual = Money.parse(String(saving?.actual ?? '0.00'));
    const actualIncome = Money.parse(String(income?.actual ?? '0.00'));
    const savingRate = calculateSavingRate(savingActual, actualIncome);

    const obligations: DashboardObligationSummary[] = obligationRows.map((row: unknown) => {
      const item = row as Record<string, unknown>;
      return {
        id: String(item.id),
        name: String(item.name),
        amount: String(item.amount),
        dueDate: String(item.due_date),
        status: String(item.status) as ObligationStatus,
        isReserved: Boolean(item.is_reserved),
      };
    });

    const recommendationRow = recommendationRows[0] as Record<string, unknown> | undefined;
    const recommendation: DashboardRecommendationSummary | null = recommendationRow ? {
      id: String(recommendationRow.id),
      type: String(recommendationRow.recommendation_type),
      priority: Number(recommendationRow.priority),
      title: String(recommendationRow.title),
      message: String(recommendationRow.message),
      reasonCode: String(recommendationRow.reason_code),
      status: String(recommendationRow.status),
    } : null;

    return {
      liquidity: String((liquidityRows[0] as Record<string, unknown> | undefined)?.total ?? '0.00'),
      incomeExpected: String(income?.expected ?? '0.00'),
      incomeActual: actualIncome.toString(),
      budgetPlanned: planned.toString(),
      budgetActual: actual.toString(),
      budgetRemaining: nonNegative(planned.subtract(actual)).toString(),
      budgetUtilizationPercent: planned.isPositive() ? calculatePercentage(actual.minorUnits, planned.minorUnits)?.percent ?? null : null,
      savingPlanned: String(saving?.planned ?? '0.00'),
      savingActual: savingActual.toString(),
      savingRate: savingRate?.percent ?? null,
      obligations,
      recommendation,
    };
  }

  private async snapshotCore(userId: string, cycleId: string) {
    const rows = await rawSql`select expected_income::text,actual_income::text,planned_expense::text,actual_expense::text,
      planned_saving::text,actual_saving::text,safe_to_spend_final::text,projected_end_balance_final::text,deficit_amount::text,
      actual_end_balance::text
      from public.cycle_snapshots where user_id=${userId} and cycle_id=${cycleId}::uuid limit 1`;
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new Error('CYCLE_SNAPSHOT_NOT_FOUND');
    return row;
  }

  async get(userId: string, cycleId?: string): Promise<DashboardSummary | null> {
    const cycleRow = await this.resolveCycle(userId, cycleId);
    if (!cycleRow) return null;
    const resolvedCycleId = String(cycleRow.id);
    const isClosed = String(cycleRow.status) === 'CLOSED';
    const cycle = mapCycle(cycleRow, isClosed ? 'SNAPSHOT' : 'LIVE');

    const [emergency, goals] = await Promise.all([
      emergencyRepository.summary(userId),
      goalRepository.list(userId),
    ]);
    const goalSummaries: DashboardGoalSummary[] = goals
      .filter((goal) => goal.status !== 'CANCELLED')
      .slice(0, MAX_GOALS)
      .map((goal) => ({
        id: goal.id,
        name: goal.name,
        status: goal.status as GoalStatus,
        targetAmount: goal.targetAmount,
        currentBalance: goal.currentBalance,
        progressPercent: goal.progressPercent,
        targetDate: goal.targetDate,
      }));

    const emergencySummary = emergency ? {
      status: emergency.status,
      targetAmount: emergency.targetAmount,
      currentBalance: emergency.currentBalance,
      progressPercent: emergency.progressPercent,
      planned: emergency.allocation?.plannedAmount ?? '0.00',
      allocated: emergency.allocation?.allocatedAmount ?? '0.00',
      actualTransferred: emergency.allocation?.actualContributedAmount ?? '0.00',
    } : null;

    if (isClosed) {
      const snapshot = await this.snapshotCore(userId, resolvedCycleId);
      const planned = Money.parse(String(snapshot.planned_expense));
      const actual = Money.parse(String(snapshot.actual_expense));
      const actualSaving = Money.parse(String(snapshot.actual_saving));
      const actualIncome = Money.parse(String(snapshot.actual_income));
      return {
        cycle,
        liquidity: { total: String(snapshot.actual_end_balance ?? '0.00') },
        safeToSpend: snapshot.safe_to_spend_final == null ? { amount: null, status: 'BLOCKED', blockingIssue: 'BUFFER_POLICY_REQUIRED' } : { amount: String(snapshot.safe_to_spend_final), status: Money.parse(String(snapshot.safe_to_spend_final)).isZero() ? 'ZERO' : 'FINALIZED', blockingIssue: null },
        dailySafeLimit: { amount: '0.00', status: 'FINALIZED', blockingIssue: null },
        income: { expected: String(snapshot.expected_income), actual: actualIncome.toString() },
        budget: { planned: planned.toString(), actual: actual.toString(), remaining: nonNegative(planned.subtract(actual)).toString(), utilizationPercent: planned.isPositive() ? calculatePercentage(actual.minorUnits, planned.minorUnits)?.percent ?? null : null },
        saving: { planned: String(snapshot.planned_saving), actual: actualSaving.toString(), rate: calculateSavingRate(actualSaving, actualIncome)?.percent ?? null },
        forecast: { projectedEndBalance: snapshot.projected_end_balance_final ? String(snapshot.projected_end_balance_final) : null, expectedDeficit: String(snapshot.deficit_amount), deficitStatus: 'FINALIZED', blockingIssue: null },
        upcomingObligations: [],
        topRecommendation: null,
        recommendationEngineStatus: 'PENDING_PHASE_22',
        emergencySummary,
        goalSummaries,
      };
    }

    // Phase 22: deterministically reconcile recommendation facts before the dashboard reads the top item.
    await runRecommendationRules(userId, resolvedCycleId);
    const live = await this.liveCore(userId, resolvedCycleId);
    const cashForecast = await calculateCashForecast(userId, resolvedCycleId);
    return {
      cycle,
      liquidity: { total: live.liquidity },
      safeToSpend: cashForecast.success
        ? { amount: cashForecast.forecast.safeUntilIncome, status: Money.parse(cashForecast.forecast.safeUntilIncome).isZero() ? 'ZERO' : 'AVAILABLE', blockingIssue: null }
        : { amount: null, status: 'BLOCKED', blockingIssue: 'BUFFER_POLICY_REQUIRED' },
      dailySafeLimit: cashForecast.success
        ? { amount: cashForecast.forecast.adaptiveDailyLimit, status: Money.parse(cashForecast.forecast.adaptiveDailyLimit).isZero() ? 'ZERO' : 'AVAILABLE', blockingIssue: null }
        : { amount: null, status: 'BLOCKED', blockingIssue: 'BUFFER_POLICY_REQUIRED' },
      income: { expected: live.incomeExpected, actual: live.incomeActual },
      budget: { planned: live.budgetPlanned, actual: live.budgetActual, remaining: live.budgetRemaining, utilizationPercent: live.budgetUtilizationPercent },
      saving: { planned: live.savingPlanned, actual: live.savingActual, rate: live.savingRate },
      forecast: cashForecast.success ? {
        projectedEndBalance: cashForecast.forecast.projectedEndBalance,
        expectedDeficit: cashForecast.forecast.protectionDeficit,
        deficitStatus: 'AVAILABLE',
        blockingIssue: null,
      } : {
        projectedEndBalance: null,
        expectedDeficit: null,
        deficitStatus: 'BUFFER_POLICY_REQUIRED',
        blockingIssue: null,
      },
      upcomingObligations: live.obligations,
      topRecommendation: live.recommendation,
      recommendationEngineStatus: 'AVAILABLE',
      emergencySummary,
      goalSummaries,
    };
  }
}

export const dashboardRepository = new DashboardRepository();
