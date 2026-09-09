import { rawSql } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import type { CycleReport, HistoricalCyclesResult, ReportCategoryVariance } from '@/features/reports/types/reports';


function mapCategory(row: Record<string, unknown>): ReportCategoryVariance {
  return {
    categoryId: String(row.category_id),
    categoryName: String(row.category_name),
    planned: String(row.planned),
    actual: String(row.actual),
    variance: String(row.variance),
    utilizationPercent: row.utilization_percent == null ? null : String(row.utilization_percent),
    status: row.final_status == null ? null : String(row.final_status),
  };
}

export class ReportRepository {
  private async cycle(userId: string, cycleId: string) {
    const rows = await rawSql`select id,name,status,start_date::text,expected_next_income_date::text
      from public.financial_cycles where id=${cycleId}::uuid and user_id=${userId} limit 1`;
    return rows[0] as Record<string, unknown> | undefined;
  }

  private async live(userId: string, cycle: Record<string, unknown>): Promise<CycleReport> {
    const cycleId = String(cycle.id);
    const [coreRows, categoryRows, advisorRows] = await Promise.all([
      rawSql`with current_plan as (
          select p.current_version_id from public.financial_plans p
          where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid and p.status in ('ACTIVE_PLAN','REVISED') limit 1
        ), totals as (
          select
            coalesce((select sum(expected_amount) from public.expected_incomes where user_id=${userId} and cycle_id=${cycleId}::uuid),0) expected_income,
            coalesce((select sum(amount) from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and transaction_type='INCOME' and status='POSTED'),0) actual_income,
            coalesce((select sum(planned_amount) from public.budget_allocations ba join current_plan cp on cp.current_version_id=ba.plan_version_id where ba.user_id=${userId}),0) planned_expense,
            coalesce((select sum(amount) from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and transaction_type='EXPENSE' and status='POSTED'),0)
              - coalesce((select sum(r.amount) from public.transactions r join public.transactions o on o.id=r.related_transaction_id and o.user_id=r.user_id where r.user_id=${userId} and r.cycle_id=${cycleId}::uuid and r.transaction_type='REFUND' and r.status='POSTED' and o.transaction_type='EXPENSE'),0)
              + coalesce((select sum(amount) from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and transaction_type='OBLIGATION_PAYMENT' and status='POSTED'),0) actual_expense,
            coalesce((select sum(t.amount) from public.transactions t where t.user_id=${userId} and t.cycle_id=${cycleId}::uuid and t.transaction_type='EXPENSE' and t.status='POSTED' and t.planning_status='UNPLANNED'),0)
              - coalesce((select sum(r.amount) from public.transactions r join public.transactions o on o.id=r.related_transaction_id and o.user_id=r.user_id where r.user_id=${userId} and r.cycle_id=${cycleId}::uuid and r.transaction_type='REFUND' and r.status='POSTED' and o.transaction_type='EXPENSE' and o.planning_status='UNPLANNED'),0) unplanned_expense,
            coalesce((select sa.planned_amount from public.saving_allocations sa join current_plan cp on cp.current_version_id=sa.plan_version_id where sa.user_id=${userId} and sa.cycle_id=${cycleId}::uuid limit 1),0) planned_saving,
            coalesce((select sum(amount) from public.saving_transfers where user_id=${userId} and cycle_id=${cycleId}::uuid),0) actual_saving,
            coalesce((select sum(amount) from public.emergency_movements where user_id=${userId} and cycle_id=${cycleId}::uuid and movement_type='CONTRIBUTION' and posted_at is not null),0) emergency_contribution,
            coalesce((select sum(amount) from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and transaction_type='GOAL_CONTRIBUTION' and status='POSTED'),0) goal_contributions
        ) select expected_income::text,actual_income::text,planned_expense::text,greatest(actual_expense,0)::text actual_expense,
          greatest(unplanned_expense,0)::text unplanned_expense,planned_saving::text,actual_saving::text,
          emergency_contribution::text,goal_contributions::text from totals`,
      rawSql`with current_plan as (
          select p.current_version_id from public.financial_plans p
          where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid and p.status in ('ACTIVE_PLAN','REVISED') limit 1
        ), alloc as (
          select ba.category_id,bc.name category_name,ba.planned_amount
          from public.budget_allocations ba join current_plan cp on cp.current_version_id=ba.plan_version_id
          join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=ba.user_id
          where ba.user_id=${userId}
        ), expense_actuals as (
          select t.category_id,coalesce(sum(t.amount),0) actual
          from public.transactions t where t.user_id=${userId} and t.cycle_id=${cycleId}::uuid and t.status='POSTED'
            and t.transaction_type='EXPENSE' and t.category_id is not null group by t.category_id
        ), refunds as (
          select o.category_id,coalesce(sum(r.amount),0) refunded
          from public.transactions r join public.transactions o on o.id=r.related_transaction_id and o.user_id=r.user_id
          where r.user_id=${userId} and r.cycle_id=${cycleId}::uuid and r.status='POSTED' and r.transaction_type='REFUND'
            and o.transaction_type='EXPENSE' and o.category_id is not null group by o.category_id
        ), actuals as (
          select coalesce(e.category_id,r.category_id) category_id,greatest(coalesce(e.actual,0)-coalesce(r.refunded,0),0) actual
          from expense_actuals e full join refunds r on r.category_id=e.category_id
        ) select a.category_id,a.category_name,a.planned_amount::text planned,coalesce(x.actual,0)::text actual,
          (a.planned_amount-coalesce(x.actual,0))::text variance,
          case when a.planned_amount>0 then round((coalesce(x.actual,0)/a.planned_amount)*100,2)::text else null end utilization_percent,
          case when coalesce(x.actual,0)>a.planned_amount then 'OVER_BUDGET' else 'NORMAL' end final_status
        from alloc a left join actuals x on x.category_id=a.category_id
        order by (coalesce(x.actual,0)-a.planned_amount) desc,a.category_name`,
      rawSql`select message from public.recommendations where user_id=${userId} and cycle_id=${cycleId}::uuid
        and status in ('NEW','VIEWED','ACCEPTED') order by priority asc,created_at desc limit 1`,
    ]);
    const core = coreRows[0] as Record<string, unknown> | undefined ?? {};
    const categories = categoryRows.map((r: unknown) => mapCategory(r as Record<string, unknown>));
    return {
      cycle: { id: cycleId, name: String(cycle.name), status: String(cycle.status), startDate: String(cycle.start_date), expectedNextIncomeDate: String(cycle.expected_next_income_date), source: 'LIVE' },
      income: { expected: String(core.expected_income ?? '0.00'), actual: String(core.actual_income ?? '0.00') },
      expense: { planned: String(core.planned_expense ?? '0.00'), actual: String(core.actual_expense ?? '0.00'), unplanned: String(core.unplanned_expense ?? '0.00') },
      saving: { planned: String(core.planned_saving ?? '0.00'), actual: String(core.actual_saving ?? '0.00') },
      finalResult: { surplus: null, deficit: null, status: 'PENDING_CLOSING' },
      emergencyContribution: String(core.emergency_contribution ?? '0.00'),
      goalContributions: String(core.goal_contributions ?? '0.00'),
      categoryVariance: categories,
      biggestOverrun: categories.find((x) => Money.parse(x.actual).compare(Money.parse(x.planned)) > 0) ?? null,
      advisorSummary: advisorRows[0] ? String((advisorRows[0] as Record<string, unknown>).message) : null,
      reviewStatus: null,
      closedAt: null,
    };
  }

  private async closed(userId: string, cycle: Record<string, unknown>): Promise<CycleReport> {
    const cycleId = String(cycle.id);
    const [snapshotRows, categoryRows, reviewRows] = await Promise.all([
      rawSql`select id,closed_at::text,expected_income::text,actual_income::text,planned_expense::text,actual_expense::text,
        planned_saving::text,actual_saving::text,emergency_contribution::text,goal_contributions::text,surplus_amount::text,deficit_amount::text,snapshot_data
        from public.cycle_snapshots where user_id=${userId} and cycle_id=${cycleId}::uuid limit 1`,
      rawSql`select ccs.category_id,bc.name category_name,ccs.planned_amount::text planned,ccs.actual_amount::text actual,
        ccs.variance_amount::text variance,ccs.utilization_percent::text,ccs.final_status
        from public.cycle_category_snapshots ccs
        join public.cycle_snapshots cs on cs.id=ccs.snapshot_id and cs.user_id=ccs.user_id
        join public.budget_categories bc on bc.id=ccs.category_id and bc.user_id=ccs.user_id
        where ccs.user_id=${userId} and cs.cycle_id=${cycleId}::uuid
        order by ccs.variance_amount asc,bc.name`,
      rawSql`select status,summary,advisor_summary from public.cycle_reviews where user_id=${userId} and cycle_id=${cycleId}::uuid limit 1`,
    ]);
    const s = snapshotRows[0] as Record<string, unknown> | undefined;
    if (!s) throw new Error('CYCLE_SNAPSHOT_NOT_FOUND');
    const categories = categoryRows.map((r: unknown) => mapCategory(r as Record<string, unknown>));
    const review = reviewRows[0] as Record<string, unknown> | undefined;
    const data = (s.snapshot_data && typeof s.snapshot_data === 'object') ? s.snapshot_data as Record<string, unknown> : {};
    const unplanned = typeof data.unplanned_spending === 'string' || typeof data.unplanned_spending === 'number' ? String(data.unplanned_spending) : null;
    return {
      cycle: { id: cycleId, name: String(cycle.name), status: String(cycle.status), startDate: String(cycle.start_date), expectedNextIncomeDate: String(cycle.expected_next_income_date), source: 'SNAPSHOT' },
      income: { expected: String(s.expected_income), actual: String(s.actual_income) },
      expense: { planned: String(s.planned_expense), actual: String(s.actual_expense), unplanned },
      saving: { planned: String(s.planned_saving), actual: String(s.actual_saving) },
      finalResult: { surplus: String(s.surplus_amount), deficit: String(s.deficit_amount), status: 'FINALIZED' },
      emergencyContribution: String(s.emergency_contribution),
      goalContributions: String(s.goal_contributions),
      categoryVariance: categories,
      biggestOverrun: categories.find((x) => Money.parse(x.actual).compare(Money.parse(x.planned)) > 0) ?? null,
      advisorSummary: review?.advisor_summary ? String(review.advisor_summary) : (review?.summary ? String(review.summary) : null),
      reviewStatus: review?.status ? String(review.status) : null,
      closedAt: String(s.closed_at),
    };
  }

  async cycleReport(userId: string, cycleId: string): Promise<CycleReport | null> {
    const cycle = await this.cycle(userId, cycleId);
    if (!cycle) return null;
    return String(cycle.status) === 'CLOSED' ? this.closed(userId, cycle) : this.live(userId, cycle);
  }

  async historical(userId: string, requestedWindow: 3 | 6): Promise<HistoricalCyclesResult> {
    const rows = await rawSql`select fc.id cycle_id,fc.name cycle_name,fc.start_date::text,cs.closed_at::text,
      cs.expected_income::text,cs.actual_income::text,cs.planned_expense::text,cs.actual_expense::text,
      cs.planned_saving::text,cs.actual_saving::text,cs.emergency_contribution::text,cs.goal_contributions::text,
      cs.surplus_amount::text,cs.deficit_amount::text,cs.actual_end_balance::text
      from public.financial_cycles fc join public.cycle_snapshots cs on cs.cycle_id=fc.id and cs.user_id=fc.user_id
      where fc.user_id=${userId} and fc.status='CLOSED'
      order by cs.closed_at desc limit ${requestedWindow}`;
    return {
      items: rows.map((r: unknown) => { const x=r as Record<string,unknown>; return {
        cycleId:String(x.cycle_id),cycleName:String(x.cycle_name),startDate:String(x.start_date),closedAt:String(x.closed_at),
        expectedIncome:String(x.expected_income),actualIncome:String(x.actual_income),plannedExpense:String(x.planned_expense),actualExpense:String(x.actual_expense),
        plannedSaving:String(x.planned_saving),actualSaving:String(x.actual_saving),emergencyContribution:String(x.emergency_contribution),goalContributions:String(x.goal_contributions),
        surplus:String(x.surplus_amount),deficit:String(x.deficit_amount),actualEndBalance:x.actual_end_balance==null?null:String(x.actual_end_balance),
      };}),
      requestedWindow,
      availableCount: rows.length,
      hasFullWindow: rows.length >= requestedWindow,
    };
  }
}

export const reportRepository = new ReportRepository();
