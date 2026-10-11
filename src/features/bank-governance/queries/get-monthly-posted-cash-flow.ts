import { rawSql } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import type { MonthlyCashFlow } from '@/features/bank-governance/smart-financial-allocation';

/**
 * Read-only history of posted external income and expenses.
 * Excludes transfers, savings movements, reversals and pending transactions
 * to avoid counting movement between the user's own accounts as cash flow.
 */
export async function getMonthlyPostedCashFlow(userId:string):Promise<MonthlyCashFlow[]>{
  const rows=await rawSql`
    select to_char(date_trunc('month',transaction_date),'YYYY-MM') as month,
      coalesce(sum(amount) filter(where transaction_type='INCOME'),0)::text as income,
      coalesce(sum(amount) filter(where transaction_type='EXPENSE'),0)::text as spending
    from public.transactions
    where user_id=${userId}
      and status='POSTED'
      and transaction_type in ('INCOME','EXPENSE')
      and transaction_date >= (date_trunc('month',current_date) - interval '12 months')
      and transaction_date < date_trunc('month',current_date)
    group by date_trunc('month',transaction_date)
    order by date_trunc('month',transaction_date) desc
    limit 12`;
  return [...rows].reverse().map(row=>{
    const income=Money.parse(String(row.income)).minorUnits;
    const spending=Money.parse(String(row.spending)).minorUnits;
    if(income<0n||spending<0n||income>BigInt(Number.MAX_SAFE_INTEGER)||spending>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('INVALID_CASH_FLOW_HISTORY');
    return {incomeHalalas:Number(income),spendingHalalas:Number(spending)};
  });
}
