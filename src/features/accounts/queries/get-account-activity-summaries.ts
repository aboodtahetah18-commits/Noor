import { rawSql } from '@/infrastructure/db/client';

export type AccountActivityPeriod = {
  key: 'day'|'week'|'month'|'quarter'|'half'|'year'|'all';
  label: string;
  count: number;
  net: string;
};

export type AccountActivitySummary = {
  accountId: string;
  totalTransactions: number;
  firstTransactionDate: string | null;
  totalInflow: string;
  totalOutflow: string;
  monthInflow: string;
  monthOutflow: string;
  monthNet: string;
  dominantCategory: string | null;
  status: 'NO_DATA'|'STABLE'|'WATCH';
  challenge: string;
  periods: AccountActivityPeriod[];
};

export async function getAccountActivitySummaries(userId: string): Promise<AccountActivitySummary[]> {
  const rows = await rawSql`
    with activity as (
      select
        t.account_id,
        t.transaction_date,
        t.status,
        t.category_id,
        bc.name category_name,
        case
          when t.status <> 'POSTED' then 0::numeric
          when t.transaction_direction='IN' or t.transaction_type in ('INCOME','REFUND') then t.amount
          when t.transaction_direction='OUT' or t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') then -t.amount
          else 0::numeric
        end as signed_amount,
        case
          when t.status='POSTED' and (t.transaction_direction='IN' or t.transaction_type in ('INCOME','REFUND')) then t.amount
          else 0::numeric
        end as inflow_amount,
        case
          when t.status='POSTED' and (t.transaction_direction='OUT' or t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')) then t.amount
          else 0::numeric
        end as outflow_amount
      from public.transactions t
      left join public.budget_categories bc on bc.id=t.category_id and bc.user_id=t.user_id
      where t.user_id=${userId} and t.account_id is not null
    ),
    category_rank as (
      select
        account_id,
        category_name,
        row_number() over(
          partition by account_id
          order by count(*) filter (where status='POSTED' and category_name is not null) desc,
                   coalesce(sum(outflow_amount) filter (where status='POSTED' and category_name is not null),0) desc
        ) rn
      from activity
      where category_name is not null
      group by account_id,category_name
    )
    select
      a.account_id,
      min(a.transaction_date)::text first_transaction_date,
      count(*) filter (where a.status='POSTED')::int all_count,
      coalesce(sum(a.signed_amount) filter (where a.status='POSTED'),0)::text all_net,
      coalesce(sum(a.inflow_amount) filter (where a.status='POSTED'),0)::text total_inflow,
      coalesce(sum(a.outflow_amount) filter (where a.status='POSTED'),0)::text total_outflow,

      coalesce(sum(a.inflow_amount) filter (
        where a.status='POSTED' and a.transaction_date >= date_trunc('month',current_date)::date
      ),0)::text month_inflow,
      coalesce(sum(a.outflow_amount) filter (
        where a.status='POSTED' and a.transaction_date >= date_trunc('month',current_date)::date
      ),0)::text month_outflow,
      coalesce(sum(a.signed_amount) filter (
        where a.status='POSTED' and a.transaction_date >= date_trunc('month',current_date)::date
      ),0)::text month_net,

      count(*) filter (where a.status='POSTED' and a.transaction_date=current_date)::int day_count,
      coalesce(sum(a.signed_amount) filter (where a.status='POSTED' and a.transaction_date=current_date),0)::text day_net,

      count(*) filter (where a.status='POSTED' and a.transaction_date >= current_date - 6)::int week_count,
      coalesce(sum(a.signed_amount) filter (where a.status='POSTED' and a.transaction_date >= current_date - 6),0)::text week_net,

      count(*) filter (where a.status='POSTED' and a.transaction_date >= (current_date - interval '1 month')::date)::int month_count,
      coalesce(sum(a.signed_amount) filter (where a.status='POSTED' and a.transaction_date >= (current_date - interval '1 month')::date),0)::text month_period_net,

      count(*) filter (where a.status='POSTED' and a.transaction_date >= (current_date - interval '3 months')::date)::int quarter_count,
      coalesce(sum(a.signed_amount) filter (where a.status='POSTED' and a.transaction_date >= (current_date - interval '3 months')::date),0)::text quarter_net,

      count(*) filter (where a.status='POSTED' and a.transaction_date >= (current_date - interval '6 months')::date)::int half_count,
      coalesce(sum(a.signed_amount) filter (where a.status='POSTED' and a.transaction_date >= (current_date - interval '6 months')::date),0)::text half_net,

      count(*) filter (where a.status='POSTED' and a.transaction_date >= (current_date - interval '1 year')::date)::int year_count,
      coalesce(sum(a.signed_amount) filter (where a.status='POSTED' and a.transaction_date >= (current_date - interval '1 year')::date),0)::text year_net,

      max(cr.category_name) filter (where cr.rn=1) dominant_category
    from activity a
    left join category_rank cr on cr.account_id=a.account_id and cr.rn=1
    group by a.account_id
  `;

  return rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    const totalTransactions = Number(row.all_count ?? 0);
    const monthInflow = Number(row.month_inflow ?? 0);
    const monthOutflow = Number(row.month_outflow ?? 0);

    let status: AccountActivitySummary['status'] = 'NO_DATA';
    let challenge = 'لا توجد بيانات كافية للحكم على نمط الحساب.';
    if (totalTransactions > 0) {
      if (monthOutflow > monthInflow * 1.15 && monthOutflow > 0) {
        status = 'WATCH';
        challenge = 'المصروفات هذا الشهر أعلى من التدفقات الداخلة؛ يحتاج الحساب إلى متابعة.';
      } else {
        status = 'STABLE';
        challenge = 'الحركة الحالية ضمن نطاق مستقر مقارنة بالتدفقات الداخلة.';
      }
    }

    const period = (key: AccountActivityPeriod['key'], label: string, countKey: string, netKey: string): AccountActivityPeriod => ({
      key,
      label,
      count: Number(row[countKey] ?? 0),
      net: String(row[netKey] ?? '0.00'),
    });

    return {
      accountId: String(row.account_id),
      totalTransactions,
      firstTransactionDate: row.first_transaction_date ? String(row.first_transaction_date) : null,
      totalInflow: String(row.total_inflow ?? '0.00'),
      totalOutflow: String(row.total_outflow ?? '0.00'),
      monthInflow: String(row.month_inflow ?? '0.00'),
      monthOutflow: String(row.month_outflow ?? '0.00'),
      monthNet: String(row.month_net ?? '0.00'),
      dominantCategory: row.dominant_category ? String(row.dominant_category) : null,
      status,
      challenge,
      periods: [
        period('day','اليوم','day_count','day_net'),
        period('week','الأسبوع','week_count','week_net'),
        period('month','الشهر','month_count','month_period_net'),
        period('quarter','الربع السنوي','quarter_count','quarter_net'),
        period('half','النصف السنوي','half_count','half_net'),
        period('year','السنة','year_count','year_net'),
        period('all','منذ البداية','all_count','all_net'),
      ],
    };
  });
}
