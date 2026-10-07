import { rawSql } from '@/infrastructure/db/client';
import { transactionHistoryFiltersSchema } from '@/features/transactions/schemas/transaction-history';
import type { TransactionHistoryFiltersInput } from '@/features/transactions/schemas/transaction-history';

export type TransactionSummary = {
  totalItems: number;
  inflow: string;
  outflow: string;
  net: string;
};

export async function getTransactionSummary(userId: string, input: TransactionHistoryFiltersInput): Promise<TransactionSummary> {
  const filters = transactionHistoryFiltersSchema.parse(input);
  const searchPattern = filters.search ? `%${filters.search}%` : null;

  const rows = await rawSql`
    select
      count(*)::int total_items,
      coalesce(sum(case
        when t.status='POSTED'
          and t.transaction_type not in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL')
          and (t.transaction_type in ('INCOME','REFUND') or t.transaction_direction='IN')
        then t.amount else 0 end),0)::text inflow,
      coalesce(sum(case
        when t.status='POSTED'
          and t.transaction_type not in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL')
          and (t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') or t.transaction_direction='OUT')
        then t.amount else 0 end),0)::text outflow
    from public.transactions t
    left join public.accounts a on a.id=t.account_id and a.user_id=t.user_id
    left join public.budget_categories bc on bc.id=t.category_id and bc.user_id=t.user_id
    where t.user_id=${userId}
      and not (t.transaction_type in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL') and t.transaction_direction='IN')
      and (${filters.dateFrom ?? null}::date is null or t.transaction_date >= ${filters.dateFrom ?? null}::date)
      and (${filters.dateTo ?? null}::date is null or t.transaction_date <= ${filters.dateTo ?? null}::date)
      and (${filters.transactionType ?? null}::text is null or t.transaction_type=${filters.transactionType ?? null})
      and (${filters.categoryId ?? null}::uuid is null or t.category_id=${filters.categoryId ?? null}::uuid)
      and (${filters.accountId ?? null}::uuid is null or t.account_id=${filters.accountId ?? null}::uuid)
      and (${filters.planningStatus ?? null}::text is null or t.planning_status=${filters.planningStatus ?? null})
      and (${searchPattern}::text is null or coalesce(t.description,'') ilike ${searchPattern}
        or coalesce(t.income_source_name,'') ilike ${searchPattern}
        or coalesce(a.name,'') ilike ${searchPattern}
        or coalesce(bc.name,'') ilike ${searchPattern})
  `;

  const row = rows[0] as Record<string, unknown> | undefined;
  const inflow = String(row?.inflow ?? '0.00');
  const outflow = String(row?.outflow ?? '0.00');
  const net = (Number(inflow) - Number(outflow)).toFixed(2);

  return {
    totalItems: Number(row?.total_items ?? 0),
    inflow,
    outflow,
    net,
  };
}
