import { rawSql } from '@/infrastructure/db/client';
export async function listPostedIncome(userId: string, cycleId: string) {
  return rawSql`select id,account_id,amount::text,transaction_date::text,description,expected_income_id,posted_at::text
    from public.transactions where user_id=${userId} and cycle_id=${cycleId} and transaction_type='INCOME' and status='POSTED'
    order by transaction_date desc,posted_at desc`;
}
