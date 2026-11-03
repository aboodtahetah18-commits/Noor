import { rawSql } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import { resolveBudgetCategoryStatus } from '@/financial-engine/budget-risk';
import type { BudgetCategoryStatus } from '@/domain/types';
import { assessMerchantSpending, type MerchantSpendingSignal } from '@/financial-engine/merchant-spending-pressure';

type RuleReference = { id: string; categoryId: string | null };

function shiftedIsoDate(isoDate: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error('MERCHANT_SPEND_INVALID_DATE');
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) {
    throw new Error('MERCHANT_SPEND_INVALID_DATE');
  }
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * A merchant is linked to a posted expense only when the bank import's final
 * transaction is verified and its merchant identity is unambiguous.
 * One posted transaction may appear in several imported statements: it still
 * counts once. Posted refunds are deducted on their own transaction dates.
 * Manual expenses without a verified merchant link are not attributed.
 */
export async function listMerchantSpendingInsights(
  userId: string,
  operationalDate: string,
  rules: readonly RuleReference[],
): Promise<Map<string, MerchantSpendingSignal>> {
  const signals = new Map<string, MerchantSpendingSignal>();
  if (rules.length === 0) return signals;

  const currentStart = shiftedIsoDate(operationalDate, -29);
  const previousStart = shiftedIsoDate(operationalDate, -59);
  const previousEnd = shiftedIsoDate(operationalDate, -30);

  const [spendingRows, budgetRows] = await Promise.all([
    rawSql`
      with unambiguous_links as (
        select br.final_transaction_id as transaction_id,
               min(br.merchant_rule_id::text)::uuid as merchant_rule_id
        from public.bank_statement_rows br
        where br.user_id=${userId}::uuid
          and br.final_transaction_id is not null
          and br.merchant_rule_id is not null
          and br.review_status <> 'IGNORED'
        group by br.final_transaction_id
        having count(distinct br.merchant_rule_id)=1
      ),
      posted_expenses as (
        select ul.merchant_rule_id,t.id,t.transaction_date,t.amount
        from unambiguous_links ul
        join public.transactions t on t.id=ul.transaction_id
        where t.user_id=${userId}::uuid
          and t.transaction_type='EXPENSE' and t.status='POSTED'
      ),
      spend_events as (
        select e.merchant_rule_id,e.id,e.transaction_date,e.amount as signed_amount,true as is_expense
        from posted_expenses e
        union all
        select e.merchant_rule_id,r.id,r.transaction_date,-r.amount as signed_amount,false as is_expense
        from public.transactions r
        join posted_expenses e on e.id=r.related_transaction_id
        where r.user_id=${userId}::uuid and r.transaction_type='REFUND' and r.status='POSTED'
      )
      select merchant_rule_id::text as "merchantId",
        coalesce(sum(signed_amount) filter (where transaction_date between ${currentStart}::date and ${operationalDate}::date),0)::text as "currentAmount",
        coalesce(sum(signed_amount) filter (where transaction_date between ${previousStart}::date and ${previousEnd}::date),0)::text as "previousAmount",
        count(*) filter (where is_expense and transaction_date between ${currentStart}::date and ${operationalDate}::date)::int as "currentCount"
      from spend_events
      where transaction_date between ${previousStart}::date and ${operationalDate}::date
      group by merchant_rule_id
    `,
    rawSql`
      select ba.category_id::text as "categoryId",ba.planned_amount::text as "plannedAmount",
        greatest(1,c.expected_next_income_date-c.start_date)::int as "cycleDays",
        greatest(0,least(c.expected_next_income_date-c.start_date,${operationalDate}::date-c.start_date+1))::int as "daysElapsed",
        greatest(0,
          coalesce((select sum(t.amount) from public.transactions t
            where t.user_id=p.user_id and t.cycle_id=p.cycle_id and t.category_id=ba.category_id
              and t.transaction_type='EXPENSE' and t.status='POSTED'),0)
          - coalesce((select sum(r.amount) from public.transactions r
            join public.transactions original on original.id=r.related_transaction_id and original.user_id=r.user_id
            where r.user_id=p.user_id and original.cycle_id=p.cycle_id and original.category_id=ba.category_id
              and r.transaction_type='REFUND' and r.status='POSTED'),0)
        )::text as "actualAmount"
      from public.financial_plans p
      join public.financial_cycles c on c.id=p.cycle_id and c.user_id=p.user_id and c.status='ACTIVE'
      join public.plan_versions pv on pv.id=p.current_version_id and pv.user_id=p.user_id and pv.is_current=true
      join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.user_id=p.user_id
      where p.user_id=${userId}::uuid and p.status='ACTIVE_PLAN'
    `,
  ]);

  const budgets = new Map<string, BudgetCategoryStatus>();
  for (const row of budgetRows) {
    const planned = Money.parse(String(row.plannedAmount));
    const actual = Money.parse(String(row.actualAmount));
    const status = resolveBudgetCategoryStatus({
      actualMinorUnits: actual.minorUnits,
      budgetMinorUnits: planned.minorUnits,
      daysElapsed: Number(row.daysElapsed),
      cycleDays: Number(row.cycleDays),
    });
    budgets.set(String(row.categoryId), status);
  }

  const spendByMerchant = new Map<string, { currentAmount: string; previousAmount: string; currentCount: number }>();
  for (const row of spendingRows) {
    spendByMerchant.set(String(row.merchantId), {
      currentAmount: String(row.currentAmount),
      previousAmount: String(row.previousAmount),
      currentCount: Number(row.currentCount),
    });
  }

  for (const rule of rules) {
    const spend = spendByMerchant.get(rule.id);
    if (!spend) continue;
    signals.set(rule.id, assessMerchantSpending({
      ...spend,
      currentTransactionCount: spend.currentCount,
      categoryBudgetStatus: rule.categoryId ? budgets.get(rule.categoryId) ?? null : null,
    }));
  }
  return signals;
}
