import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import type { RecordRefundInput } from '@/features/refunds/schemas/refund';
import type { RefundResult } from '@/features/refunds/types/refund';
import { Money } from '@/financial-engine/money';

async function loadResult(userId:string,idempotencyKey:string):Promise<RefundResult|null>{
  const rows=await rawSql`select r.id,r.related_transaction_id,r.amount::text,r.transaction_date::text,r.account_id,r.category_id,r.posted_at::text,
      o.amount::text original_amount,coalesce(ab.balance,0)::text account_balance,
      coalesce((select sum(x.amount) from public.transactions x where x.user_id=r.user_id and x.transaction_type='REFUND' and x.status='POSTED' and x.related_transaction_id=o.id),0)::text refunded,
      greatest(o.amount-coalesce((select sum(x.amount) from public.transactions x where x.user_id=r.user_id and x.transaction_type='REFUND' and x.status='POSTED' and x.related_transaction_id=o.id),0),0)::text remaining,
      greatest(coalesce((select sum(e.amount) from public.transactions e where e.user_id=r.user_id and e.cycle_id=r.cycle_id and e.category_id=r.category_id and e.transaction_type='EXPENSE' and e.status='POSTED'),0)
        -coalesce((select sum(f.amount) from public.transactions f join public.transactions oe on oe.id=f.related_transaction_id and oe.user_id=f.user_id where f.user_id=r.user_id and oe.cycle_id=r.cycle_id and oe.category_id=r.category_id and f.transaction_type='REFUND' and f.status='POSTED'),0),0)::text category_actual
    from public.transactions r join public.transactions o on o.id=r.related_transaction_id and o.user_id=r.user_id
    left join public.account_balances_v ab on ab.user_id=r.user_id and ab.account_id=r.account_id
    where r.user_id=${userId} and r.idempotency_key=${idempotencyKey} and r.transaction_type='REFUND' and r.status='POSTED' limit 1`;
  if(!rows[0]) return null; const q=rows[0] as Record<string,unknown>;
  return {transactionId:String(q.id),originalTransactionId:String(q.related_transaction_id),status:'POSTED',amount:String(q.amount),transactionDate:String(q.transaction_date),accountId:String(q.account_id),categoryId:String(q.category_id),originalExpenseAmount:String(q.original_amount),totalRefunded:String(q.refunded),remainingRefundable:String(q.remaining),accountBalanceAfter:String(q.account_balance),categoryActualAfter:String(q.category_actual),postedAt:String(q.posted_at),safeToSpendStatus:'BUFFER_POLICY_REQUIRED',safeToSpendBlockingIssue:'BUFFER_POLICY_REQUIRED'};
}

export class RefundRepository {
  async record(userId:string,input:RecordRefundInput):Promise<RefundResult>{
    const existing=await loadResult(userId,input.idempotencyKey);
    if(existing){ if(existing.originalTransactionId!==input.originalTransactionId || existing.amount!==Money.parse(input.amount).toString()) throw new Error('IDEMPOTENCY_KEY_REUSED'); return existing; }
    const id=randomUUID();
    const result=await rawSql.transaction([
      rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,category_id,related_transaction_id,idempotency_key)
        select ${id},${userId},o.cycle_id,${input.accountId},'REFUND','PENDING',${input.amount},${input.transactionDate},${input.description??null},o.category_id,o.id,${input.idempotencyKey}
        from public.transactions o
        where o.id=${input.originalTransactionId}::uuid and o.user_id=${userId} and o.transaction_type='EXPENSE' and o.status='POSTED'
          and exists(select 1 from public.accounts a where a.id=${input.accountId}::uuid and a.user_id=${userId} and a.is_active=true)
          and exists(select 1 from public.financial_cycles c where c.id=o.cycle_id and c.user_id=${userId} and c.status='ACTIVE')
        returning id`,
      rawSql`update public.transactions set status='POSTED',posted_at=now(),updated_at=now() where id=${id} and user_id=${userId} and status='PENDING' returning id`,
    ]);
    if(!(result[0] as unknown[])[0] || !(result[1] as unknown[])[0]) throw new Error('REFUND_PRECONDITION_FAILED');
    const posted=await loadResult(userId,input.idempotencyKey); if(!posted) throw new Error('REFUND_RESULT_NOT_FOUND'); return posted;
  }
}
export const refundRepository=new RefundRepository();
