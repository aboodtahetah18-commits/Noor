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
  periods: AccountActivityPeriod[];
};

export async function getAccountActivitySummaries(userId: string): Promise<AccountActivitySummary[]> {
  const rows = await rawSql`
    with activity as (
      select
        t.account_id,
        t.transaction_date,
        t.status,
        case
          when t.status <> 'POSTED' then 0::numeric
          when t.transaction_direction='IN' or t.transaction_type in ('INCOME','REFUND') then t.amount
          when t.transaction_direction='OUT' or t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') then -t.amount
          else 0::numeric
        end as signed_amount
      from public.transactions t
      where t.user_id=${userId} and t.account_id is not null
    )
    select
      account_id,
      min(transaction_date)::text first_transaction_date,
      count(*) filter (where status='POSTED')::int all_count,
      coalesce(sum(signed_amount) filter (where status='POSTED'),0)::text all_net,

      count(*) filter (where status='POSTED' and transaction_date=current_date)::int day_count,
      coalesce(sum(signed_amount) filter (where status='POSTED' and transaction_date=current_date),0)::text day_net,

      count(*) filter (where status='POSTED' and transaction_date >= current_date - 6)::int week_count,
      coalesce(sum(signed_amount) filter (where status='POSTED' and transaction_date >= current_date - 6),0)::text week_net,

      count(*) filter (where status='POSTED' and transaction_date >= (current_date - interval '1 month')::date)::int month_count,
      coalesce(sum(signed_amount) filter (where status='POSTED' and transaction_date >= (current_date - interval '1 month')::date),0)::text month_net,

      count(*) filter (where status='POSTED' and transaction_date >= (current_date - interval '3 months')::date)::int quarter_count,
      coalesce(sum(signed_amount) filter (where status='POSTED' and transaction_date >= (current_date - interval '3 months')::date),0)::text quarter_net,

      count(*) filter (where status='POSTED' and transaction_date >= (current_date - interval '6 months')::date)::int half_count,
      coalesce(sum(signed_amount) filter (where status='POSTED' and transaction_date >= (current_date - interval '6 months')::date),0)::text half_net,

      count(*) filter (where status='POSTED' and transaction_date >= (current_date - interval '1 year')::date)::int year_count,
      coalesce(sum(signed_amount) filter (where status='POSTED' and transaction_date >= (current_date - interval '1 year')::date),0)::text year_net
    from activity
    group by account_id
  `;

  return rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    const period = (key: AccountActivityPeriod['key'], label: string, countKey: string, netKey: string): AccountActivityPeriod => ({
      key,
      label,
      count: Number(row[countKey] ?? 0),
      net: String(row[netKey] ?? '0.00'),
    });

    return {
      accountId: String(row.account_id),
      totalTransactions: Number(row.all_count ?? 0),
      firstTransactionDate: row.first_transaction_date ? String(row.first_transaction_date) : null,
      periods: [
        period('day','اليوم','day_count','day_net'),
        period('week','الأسبوع','week_count','week_net'),
        period('month','الشهر','month_count','month_net'),
        period('quarter','الربع السنوي','quarter_count','quarter_net'),
        period('half','النصف السنوي','half_count','half_net'),
        period('year','السنة','year_count','year_net'),
        period('all','منذ البداية','all_count','all_net'),
      ],
    };
  });
}
