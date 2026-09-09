import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import type { RecordExpenseInput } from '@/features/expenses/schemas/expense';
import type { ExpenseBudgetImpact, ExpenseFinancialImpact, ExpenseListItem, ExpenseTransactionView } from '@/features/expenses/types/expense';
import { Money, sumMoney } from '@/financial-engine/money';
import { calculateCategoryRemaining, calculateCategoryUtilization } from '@/financial-engine/category';
import { resolveBudgetCategoryStatus } from '@/financial-engine/budget-risk';
import { calculateDailySafeLimit } from '@/financial-engine/daily-safe-limit';
import { calculateExpectedDeficit } from '@/financial-engine/expected-deficit';
import { calculateSafeToSpend } from '@/financial-engine/safe-to-spend';
import { getActiveFinancialBufferPolicy, calculateRequiredFinancialBuffer } from '@/features/financial-buffer/services/financial-buffer-service';
import type { BudgetCategoryStatus } from '@/domain/types';

function transactionView(row: Record<string, unknown>): ExpenseTransactionView {
  return {
    id: String(row.id),
    cycleId: String(row.cycle_id),
    accountId: String(row.account_id),
    categoryId: String(row.category_id),
    amount: String(row.amount),
    transactionDate: String(row.transaction_date),
    planningStatus: String(row.planning_status) as ExpenseTransactionView['planningStatus'],
    expenseNature: String(row.expense_nature) as ExpenseTransactionView['expenseNature'],
    description: row.description ? String(row.description) : null,
    status: 'POSTED',
    postedAt: String(row.posted_at),
  };
}

export class ExpenseRepository {
  async record(userId: string, input: RecordExpenseInput): Promise<ExpenseTransactionView> {
    const existing = await rawSql`select id,cycle_id,account_id,category_id,amount::text,transaction_date::text,planning_status,expense_nature,description,posted_at::text
      from public.transactions
      where user_id=${userId} and idempotency_key=${input.idempotencyKey} and transaction_type='EXPENSE'
      limit 1`;
    if (existing[0]) return transactionView(existing[0] as Record<string, unknown>);

    const id = randomUUID();
    const result = await rawSql.transaction([
      rawSql`insert into public.transactions(
          id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,
          category_id,planning_status,expense_nature,idempotency_key
        )
        select ${id},${userId},${input.cycleId},${input.accountId},'EXPENSE','PENDING',${input.amount},${input.transactionDate},${input.description ?? null},
          ${input.categoryId},${input.planningStatus},${input.expenseNature},${input.idempotencyKey}
        where exists(select 1 from public.financial_cycles c where c.id=${input.cycleId} and c.user_id=${userId} and c.status='ACTIVE')
          and exists(select 1 from public.accounts a where a.id=${input.accountId} and a.user_id=${userId} and a.is_active=true)
          and exists(select 1 from public.budget_categories bc where bc.id=${input.categoryId} and bc.user_id=${userId} and bc.is_active=true)
          and exists(
            select 1 from public.financial_plans p
            where p.cycle_id=${input.cycleId} and p.user_id=${userId} and p.status='ACTIVE_PLAN' and p.current_version_id is not null
          )
        returning id`,
      rawSql`update public.transactions
        set status='POSTED',posted_at=now(),updated_at=now()
        where id=${id} and user_id=${userId} and status='PENDING'
        returning id,cycle_id,account_id,category_id,amount::text,transaction_date::text,planning_status,expense_nature,description,posted_at::text`,
    ]);
    const rows = result[1] as unknown[];
    if (!rows[0]) throw new Error('EXPENSE_PRECONDITION_FAILED');
    return transactionView(rows[0] as Record<string, unknown>);
  }

  async getBudgetImpact(userId: string, cycleId: string, categoryId: string): Promise<ExpenseBudgetImpact> {
    const rows = await rawSql`select
        bc.id category_id, bc.name category_name, ba.planned_amount::text planned_amount,
        greatest(1,(c.expected_next_income_date-c.start_date))::int cycle_days,
        greatest(0,least((c.expected_next_income_date-c.start_date),(current_date-c.start_date+1)))::int days_elapsed,
        greatest(
          coalesce(sum(t.amount) filter(where t.transaction_type='EXPENSE' and t.status='POSTED'),0)
          - coalesce((select sum(r.amount) from public.transactions r join public.transactions oe on oe.id=r.related_transaction_id and oe.user_id=r.user_id where r.user_id=p.user_id and oe.cycle_id=p.cycle_id and oe.category_id=bc.id and r.transaction_type='REFUND' and r.status='POSTED'),0),0)::text actual_amount
      from public.financial_plans p
      join public.financial_cycles c on c.id=p.cycle_id and c.user_id=p.user_id
      join public.plan_versions pv on pv.id=p.current_version_id and pv.user_id=p.user_id and pv.is_current=true
      join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.user_id=p.user_id and ba.category_id=${categoryId}
      join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=p.user_id
      left join public.transactions t on t.user_id=p.user_id and t.cycle_id=p.cycle_id and t.category_id=bc.id
      where p.user_id=${userId} and p.cycle_id=${cycleId} and p.status='ACTIVE_PLAN'
      group by bc.id,bc.name,ba.planned_amount,c.start_date,c.expected_next_income_date`;
    if (!rows[0]) throw new Error('CATEGORY_NOT_IN_ACTIVE_PLAN');
    const row = rows[0] as Record<string, unknown>;
    const planned = Money.parse(String(row.planned_amount));
    const actual = Money.parse(String(row.actual_amount));
    const remaining = calculateCategoryRemaining(planned, actual);
    const utilization = calculateCategoryUtilization(planned, actual);
    const status: BudgetCategoryStatus = resolveBudgetCategoryStatus({
      actualMinorUnits: actual.minorUnits,
      budgetMinorUnits: planned.minorUnits,
      daysElapsed: Number(row.days_elapsed ?? 0),
      cycleDays: Number(row.cycle_days ?? 1),
    });
    return {
      categoryId: String(row.category_id),
      categoryName: String(row.category_name),
      planned: planned.toString(),
      actual: actual.toString(),
      remaining: remaining.toString(),
      utilizationPercent: utilization.ratio?.percent ?? null,
      hasSpendAgainstZeroBudget: utilization.hasSpendAgainstZeroBudget,
      status,
      atRiskEvaluation: status === 'OVER_BUDGET' ? 'NOT_APPLICABLE_OVER_BUDGET' : 'P56_LINEAR_PACE_RULE',
    };
  }

  async getFinancialImpact(userId: string, cycleId: string, accountId: string): Promise<ExpenseFinancialImpact> {
    const accountRows = await rawSql`select balance::text from public.account_balances_v where user_id=${userId} and account_id=${accountId} limit 1`;
    const liquidityRows = await rawSql`select coalesce(sum(v.balance),0)::text total from public.account_balances_v v join public.accounts a on a.id=v.account_id and a.user_id=v.user_id where v.user_id=${userId} and a.is_active=true`;
    const cycleRows = await rawSql`select expected_next_income_date::text from public.financial_cycles where id=${cycleId} and user_id=${userId} and status='ACTIVE' limit 1`;
    if (!cycleRows[0]) throw new Error('CYCLE_NOT_ACTIVE');

    const obligationRows = await rawSql`select coalesce(sum(amount),0)::text total from public.obligation_occurrences
      where user_id=${userId} and cycle_id=${cycleId} and status in ('UPCOMING','DUE','OVERDUE') and is_reserved=true`;

    const essentialRows = await rawSql`select coalesce(sum(greatest(ba.planned_amount - coalesce(sp.actual,0),0)),0)::text total
      from public.financial_plans p
      join public.plan_versions pv on pv.id=p.current_version_id and pv.user_id=p.user_id and pv.is_current=true
      join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.user_id=p.user_id and ba.allocation_type='ESSENTIAL'
      left join lateral (
        select greatest(coalesce(sum(t.amount),0)-coalesce((select sum(r.amount) from public.transactions r join public.transactions oe on oe.id=r.related_transaction_id and oe.user_id=r.user_id where r.user_id=p.user_id and oe.cycle_id=p.cycle_id and oe.category_id=ba.category_id and r.transaction_type='REFUND' and r.status='POSTED'),0),0) actual from public.transactions t
        where t.user_id=p.user_id and t.cycle_id=p.cycle_id and t.category_id=ba.category_id and t.transaction_type='EXPENSE' and t.status='POSTED'
      ) sp on true
      where p.user_id=${userId} and p.cycle_id=${cycleId} and p.status='ACTIVE_PLAN'`;

    const protectedRows = await rawSql`select
        coalesce(sum(ba.planned_amount) filter(where ba.allocation_type='SAVING'),0)::text savings,
        coalesce(sum(ba.planned_amount) filter(where ba.allocation_type='EMERGENCY'),0)::text emergency,
        coalesce(sum(ba.planned_amount) filter(where ba.allocation_type='GOAL'),0)::text goals
      from public.financial_plans p
      join public.plan_versions pv on pv.id=p.current_version_id and pv.user_id=p.user_id and pv.is_current=true
      join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.user_id=p.user_id
      where p.user_id=${userId} and p.cycle_id=${cycleId} and p.status='ACTIVE_PLAN'`;

    const liquidity = Money.parse(String((liquidityRows[0] as Record<string, unknown>)?.total ?? '0'));
    const reserved = Money.parse(String((obligationRows[0] as Record<string, unknown>)?.total ?? '0'));
    const essentials = Money.parse(String((essentialRows[0] as Record<string, unknown>)?.total ?? '0'));
    const protectedRow = (protectedRows[0] ?? {}) as Record<string, unknown>;
    const protectedSavings = Money.parse(String(protectedRow.savings ?? '0'));
    const protectedEmergency = Money.parse(String(protectedRow.emergency ?? '0'));
    const protectedGoals = Money.parse(String(protectedRow.goals ?? '0'));
    const knownProtected = sumMoney([reserved, essentials, protectedSavings, protectedEmergency, protectedGoals]);
    const baseBeforeBuffer = liquidity.subtract(knownProtected);
    const policy = await getActiveFinancialBufferPolicy(userId);
    if (!policy) {
      return {
        accountBalance: String((accountRows[0] as Record<string, unknown>)?.balance ?? '0.00'), totalLiquidity: liquidity.toString(), knownProtectedAmountsBeforeBuffer: knownProtected.toString(), baseAvailableBeforeRequiredBuffer: baseBeforeBuffer.toString(),
        safeToSpend: { amount: null, previousAmount: null, change: null, status: 'BUFFER_POLICY_REQUIRED', blockingIssue: null },
        dailySafeLimit: { amount: null, status: 'BUFFER_POLICY_REQUIRED' },
        expectedDeficit: { amount: null, status: 'BUFFER_POLICY_REQUIRED' },
      };
    }
    const incomeRows = await rawSql`select
      coalesce((select sum(amount) from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and transaction_type='INCOME' and status='POSTED'),0)::text actual_income,
      coalesce((select sum(expected_amount) from public.expected_incomes where user_id=${userId} and cycle_id=${cycleId}::uuid),0)::text expected_income`;
    const incomeRow = (incomeRows[0] ?? {}) as Record<string, unknown>;
    const actualIncome = Money.parse(String(incomeRow.actual_income ?? '0'));
    const expectedIncome = Money.parse(String(incomeRow.expected_income ?? '0'));
    const requiredBuffer = calculateRequiredFinancialBuffer(policy, actualIncome.isPositive() ? actualIncome : expectedIncome);
    const safeResult = calculateSafeToSpend({ availableLiquidity: liquidity, reservedUnpaidObligations: reserved, remainingEssentialNeeds: essentials, protectedSavings, protectedEmergencyAllocation: protectedEmergency, protectedGoalAllocations: protectedGoals, requiredFinancialBuffer: requiredBuffer });
    const nextDate = String((cycleRows[0] as Record<string, unknown>).expected_next_income_date);
    const today = new Date().toISOString().slice(0,10);
    const remainingDays = Math.max(0, Math.ceil((Date.parse(`${nextDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000));
    const daily = calculateDailySafeLimit(safeResult.displayAmount, remainingDays);
    const deficit = calculateExpectedDeficit(safeResult.calculated);
    return {
      accountBalance: String((accountRows[0] as Record<string, unknown>)?.balance ?? '0.00'), totalLiquidity: liquidity.toString(), knownProtectedAmountsBeforeBuffer: knownProtected.toString(), baseAvailableBeforeRequiredBuffer: baseBeforeBuffer.toString(),
      safeToSpend: { amount: safeResult.displayAmount.toString(), previousAmount: null, change: null, status: safeResult.status, blockingIssue: null },
      dailySafeLimit: { amount: daily.amount.toString(), status: daily.calculable ? 'AVAILABLE' : 'ZERO' },
      expectedDeficit: { amount: deficit.toString(), status: deficit.isPositive() ? 'DEFICIT_RISK' : 'NO_DEFICIT' },
    };
  }

  async list(userId: string, cycleId?: string): Promise<ExpenseListItem[]> {
    const rows=await rawSql`select t.id,t.cycle_id,t.account_id,t.category_id,t.amount::text,t.transaction_date::text,t.planning_status,t.expense_nature,t.description,t.posted_at::text,
        bc.name category_name,a.name account_name
      from public.transactions t
      join public.accounts a on a.id=t.account_id and a.user_id=t.user_id
      join public.budget_categories bc on bc.id=t.category_id and bc.user_id=t.user_id
      where t.user_id=${userId} and t.transaction_type='EXPENSE' and t.status='POSTED'
        and (${cycleId ?? null}::uuid is null or t.cycle_id=${cycleId ?? null})
      order by t.transaction_date desc,t.created_at desc limit 100`;
    return rows.map((row)=>({
      id:String(row.id),cycle_id:String(row.cycle_id),account_id:String(row.account_id),category_id:String(row.category_id),amount:String(row.amount),transaction_date:String(row.transaction_date),
      planning_status:String(row.planning_status) as ExpenseListItem['planning_status'],expense_nature:String(row.expense_nature) as ExpenseListItem['expense_nature'],
      description:row.description==null?null:String(row.description),posted_at:String(row.posted_at),category_name:String(row.category_name),account_name:String(row.account_name),
    }));
  }
}

export const expenseRepository = new ExpenseRepository();
