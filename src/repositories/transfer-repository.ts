import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import type { TransferBetweenAccountsInput } from '@/features/transfers/schemas/transfer';
import type { TransferResult } from '@/features/transfers/types/transfer';

async function balances(userId:string, fromAccountId:string, toAccountId:string) {
  const rows = await rawSql`select account_id,balance::text from public.account_balances_v
    where user_id=${userId} and account_id in (${fromAccountId}::uuid,${toAccountId}::uuid)`;
  const map = new Map(rows.map((row: unknown) => { const r = row as Record<string, unknown>; return [String(r.account_id), String(r.balance)] as const; }));
  return { from:map.get(fromAccountId) ?? '0.00', to:map.get(toAccountId) ?? '0.00' };
}

async function loadExisting(userId:string, idempotencyKey:string):Promise<TransferResult|null> {
  const rows = await rawSql`select tr.id,tr.from_account_id,tr.to_account_id,tr.amount::text,tr.transaction_date::text,tr.posted_at::text,
      o.id out_transaction_id,i.id in_transaction_id
    from public.transfers tr
    join public.transactions o on o.transfer_id=tr.id and o.user_id=tr.user_id and o.transaction_direction='OUT'
    join public.transactions i on i.transfer_id=tr.id and i.user_id=tr.user_id and i.transaction_direction='IN'
    where tr.user_id=${userId} and tr.idempotency_key=${idempotencyKey} and tr.posted_at is not null
    limit 1`;
  if (!rows[0]) return null;
  const r=rows[0] as Record<string,unknown>;
  const b=await balances(userId,String(r.from_account_id),String(r.to_account_id));
  return { transferId:String(r.id),status:'POSTED',fromAccountId:String(r.from_account_id),toAccountId:String(r.to_account_id),amount:String(r.amount),transactionDate:String(r.transaction_date),outTransactionId:String(r.out_transaction_id),inTransactionId:String(r.in_transaction_id),fromAccountBalanceAfter:b.from,toAccountBalanceAfter:b.to,totalLiquidityChange:'0.00',postedAt:String(r.posted_at) };
}

export class TransferRepository {
  async transfer(userId:string,input:TransferBetweenAccountsInput):Promise<TransferResult> {
    const existing=await loadExisting(userId,input.idempotencyKey);
    if(existing) {
      if(existing.fromAccountId!==input.fromAccountId || existing.toAccountId!==input.toAccountId || existing.amount!==input.amount) throw new Error('IDEMPOTENCY_KEY_REUSED');
      return existing;
    }
    const transferId=randomUUID(), outId=randomUUID(), inId=randomUUID();
    const postedAt=new Date();
    const result=await rawSql.transaction([
      rawSql`insert into public.transfers(id,user_id,cycle_id,from_account_id,to_account_id,amount,transaction_date,description,idempotency_key,posted_at)
        select ${transferId},${userId},${input.cycleId},${input.fromAccountId},${input.toAccountId},${input.amount},${input.transactionDate},${input.description ?? null},${input.idempotencyKey},${postedAt}
        where exists(select 1 from public.financial_cycles c where c.id=${input.cycleId} and c.user_id=${userId} and c.status='ACTIVE')
          and exists(select 1 from public.accounts a where a.id=${input.fromAccountId} and a.user_id=${userId} and a.is_active=true)
          and exists(select 1 from public.accounts a where a.id=${input.toAccountId} and a.user_id=${userId} and a.is_active=true)
        returning id`,
      rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,transaction_direction,transfer_id,idempotency_key,posted_at)
        select ${outId},${userId},${input.cycleId},${input.fromAccountId},'TRANSFER','POSTED',${input.amount},${input.transactionDate},${input.description ?? null},'OUT',${transferId},${input.idempotencyKey+':OUT'},${postedAt}
        where exists(select 1 from public.transfers where id=${transferId} and user_id=${userId}) returning id`,
      rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,transaction_direction,transfer_id,idempotency_key,posted_at)
        select ${inId},${userId},${input.cycleId},${input.toAccountId},'TRANSFER','POSTED',${input.amount},${input.transactionDate},${input.description ?? null},'IN',${transferId},${input.idempotencyKey+':IN'},${postedAt}
        where exists(select 1 from public.transfers where id=${transferId} and user_id=${userId}) returning id`,
    ]);
    if (!(result[0] as unknown[])[0] || !(result[1] as unknown[])[0] || !(result[2] as unknown[])[0]) throw new Error('TRANSFER_PRECONDITION_FAILED');
    const b=await balances(userId,input.fromAccountId,input.toAccountId);
    return {transferId,status:'POSTED',fromAccountId:input.fromAccountId,toAccountId:input.toAccountId,amount:input.amount,transactionDate:input.transactionDate,outTransactionId:outId,inTransactionId:inId,fromAccountBalanceAfter:b.from,toAccountBalanceAfter:b.to,totalLiquidityChange:'0.00',postedAt:postedAt.toISOString()};
  }
}
export const transferRepository=new TransferRepository();
