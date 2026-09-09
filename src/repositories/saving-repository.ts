import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import type { TransferSavingInput } from '@/features/savings/schemas/saving';
import type { SavingSummary, SavingTransferResult } from '@/features/savings/types/saving';
import type { SavingAllocationStatus } from '@/domain/types';

function statusFor(allocated:string, actual:string, stored:SavingAllocationStatus):SavingAllocationStatus {
  if(stored==='CANCELLED') return stored;
  const a=Money.parse(allocated),x=Money.parse(actual);
  if(x.isZero()) return 'ALLOCATED';
  if(x.compare(a)>=0) return 'TRANSFERRED';
  return 'PARTIALLY_TRANSFERRED';
}

async function balances(userId:string,fromAccountId:string,toAccountId:string){
  const rows=await rawSql`select account_id,balance::text from public.account_balances_v where user_id=${userId} and account_id in (${fromAccountId}::uuid,${toAccountId}::uuid)`;
  const map=new Map(rows.map((r:unknown)=>{const x=r as Record<string,unknown>;return [String(x.account_id),String(x.balance)] as const;}));
  return {from:map.get(fromAccountId)??'0.00',to:map.get(toAccountId)??'0.00'};
}

export class SavingRepository {
  async getSummary(userId:string,cycleId?:string):Promise<SavingSummary|null>{
    const rows=await rawSql`select sa.id,sa.cycle_id,sa.plan_version_id,sa.planned_amount::text,sa.allocated_amount::text,sa.status,
      coalesce(sum(st.amount) filter(where st.posted_at is not null),0)::text actual_transferred
      from public.saving_allocations sa
      join public.financial_cycles c on c.id=sa.cycle_id and c.user_id=sa.user_id
      left join public.saving_transfers st on st.cycle_id=sa.cycle_id and st.user_id=sa.user_id
      where sa.user_id=${userId}
        and (${cycleId??null}::uuid is null or sa.cycle_id=${cycleId??null}::uuid)
        and (${cycleId??null}::uuid is not null or c.status='ACTIVE')
      group by sa.id
      order by sa.created_at desc limit 1`;
    if(!rows[0]) return null;
    const r=rows[0] as Record<string,unknown>;
    const allocated=String(r.allocated_amount), actual=String(r.actual_transferred);
    const remaining=Money.parse(allocated).subtract(Money.parse(actual));
    return {savingAllocationId:String(r.id),cycleId:String(r.cycle_id),planVersionId:String(r.plan_version_id),plannedAmount:String(r.planned_amount),allocatedAmount:allocated,actualTransferredAmount:actual,remainingToTransfer:remaining.isNegative()?'0.00':remaining.toString(),status:statusFor(allocated,actual,String(r.status) as SavingAllocationStatus)};
  }

  async transfer(userId:string,input:TransferSavingInput):Promise<SavingTransferResult>{
    const existing=await rawSql`select st.id,st.saving_allocation_id,st.from_account_id,st.to_account_id,st.amount::text,st.transaction_date::text,st.posted_at::text,
      o.id out_transaction_id,i.id in_transaction_id
      from public.saving_transfers st
      join public.transactions o on o.saving_transfer_id=st.id and o.transaction_direction='OUT' and o.user_id=st.user_id
      join public.transactions i on i.saving_transfer_id=st.id and i.transaction_direction='IN' and i.user_id=st.user_id
      where st.user_id=${userId} and st.idempotency_key=${input.idempotencyKey} limit 1`;
    if(existing[0]){
      const e=existing[0] as Record<string,unknown>;
      if(String(e.saving_allocation_id)!==input.savingAllocationId||String(e.from_account_id)!==input.fromAccountId||String(e.to_account_id)!==input.toAccountId||String(e.amount)!==input.amount) throw new Error('IDEMPOTENCY_KEY_REUSED');
      const summary=await this.getSummary(userId);
      const b=await balances(userId,input.fromAccountId,input.toAccountId);
      if(!summary) throw new Error('SAVING_ALLOCATION_NOT_FOUND');
      return {savingTransferId:String(e.id),savingAllocationId:input.savingAllocationId,outTransactionId:String(e.out_transaction_id),inTransactionId:String(e.in_transaction_id),amount:String(e.amount),transactionDate:String(e.transaction_date),fromAccountId:input.fromAccountId,toAccountId:input.toAccountId,fromAccountBalanceAfter:b.from,toAccountBalanceAfter:b.to,actualTransferredAmount:summary.actualTransferredAmount,remainingToTransfer:summary.remainingToTransfer,allocationStatus:summary.status,totalLiquidityChange:'0.00',postedAt:String(e.posted_at)};
    }

    const allocationRows=await rawSql`select sa.id,sa.cycle_id,sa.allocated_amount::text,
      coalesce(sum(st.amount) filter(where st.posted_at is not null),0)::text actual
      from public.saving_allocations sa
      join public.financial_cycles c on c.id=sa.cycle_id and c.user_id=sa.user_id and c.status='ACTIVE'
      left join public.saving_transfers st on st.cycle_id=sa.cycle_id and st.user_id=sa.user_id
      where sa.id=${input.savingAllocationId}::uuid and sa.user_id=${userId} and sa.status in ('ALLOCATED','PARTIALLY_TRANSFERRED')
      group by sa.id limit 1`;
    if(!allocationRows[0]) throw new Error('SAVING_ALLOCATION_NOT_AVAILABLE');
    const ar=allocationRows[0] as Record<string,unknown>;
    const remaining=Money.parse(String(ar.allocated_amount)).subtract(Money.parse(String(ar.actual)));
    if(Money.parse(input.amount).compare(remaining)>0) throw new Error('SAVING_TRANSFER_EXCEEDS_REMAINING');

    const transferId=randomUUID(),outId=randomUUID(),inId=randomUUID(),postedAt=new Date();
    const tx=await rawSql.transaction([
      rawSql`select id from public.saving_allocations where id=${input.savingAllocationId}::uuid and user_id=${userId} for update`,
      rawSql`insert into public.saving_transfers(id,user_id,saving_allocation_id,cycle_id,from_account_id,to_account_id,amount,transaction_date,description,idempotency_key,posted_at)
        select ${transferId},${userId},sa.id,sa.cycle_id,${input.fromAccountId},${input.toAccountId},${input.amount},${input.transactionDate},${input.description??null},${input.idempotencyKey},${postedAt}
        from public.saving_allocations sa join public.financial_cycles c on c.id=sa.cycle_id and c.user_id=sa.user_id
        where sa.id=${input.savingAllocationId}::uuid and sa.user_id=${userId} and c.status='ACTIVE' and sa.status in ('ALLOCATED','PARTIALLY_TRANSFERRED')
          and ${input.amount}::numeric <= greatest(sa.allocated_amount-coalesce((select sum(x.amount) from public.saving_transfers x where x.cycle_id=sa.cycle_id and x.user_id=sa.user_id and x.posted_at is not null),0),0)
          and exists(select 1 from public.accounts a where a.id=${input.fromAccountId}::uuid and a.user_id=${userId} and a.is_active=true)
          and exists(select 1 from public.accounts a where a.id=${input.toAccountId}::uuid and a.user_id=${userId} and a.is_active=true)
        returning id`,
      rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,transaction_direction,saving_transfer_id,idempotency_key,posted_at)
        select ${outId},${userId},cycle_id,from_account_id,'SAVING_TRANSFER','POSTED',amount,transaction_date,description,'OUT',id,${input.idempotencyKey+':OUT'},${postedAt}
        from public.saving_transfers where id=${transferId} and user_id=${userId} returning id`,
      rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,transaction_direction,saving_transfer_id,idempotency_key,posted_at)
        select ${inId},${userId},cycle_id,to_account_id,'SAVING_TRANSFER','POSTED',amount,transaction_date,description,'IN',id,${input.idempotencyKey+':IN'},${postedAt}
        from public.saving_transfers where id=${transferId} and user_id=${userId} returning id`,
      rawSql`with before as (
          select id,user_id,status from public.saving_allocations where id=${input.savingAllocationId}::uuid and user_id=${userId}
        ), changed as (
          update public.saving_allocations sa set status=case
            when coalesce((select sum(x.amount) from public.saving_transfers x where x.cycle_id=sa.cycle_id and x.user_id=sa.user_id and x.posted_at is not null),0) >= sa.allocated_amount then 'TRANSFERRED'
            when coalesce((select sum(x.amount) from public.saving_transfers x where x.cycle_id=sa.cycle_id and x.user_id=sa.user_id and x.posted_at is not null),0) > 0 then 'PARTIALLY_TRANSFERRED'
            else 'ALLOCATED' end,updated_at=now()
          where sa.id=${input.savingAllocationId}::uuid and sa.user_id=${userId} returning id,user_id,status
        ), audit as (
          insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,created_at)
          select gen_random_uuid(),c.user_id,'SAVING_ALLOCATION',c.id,b.status,c.status,'TRANSFER_SAVING',now()
          from changed c join before b on b.id=c.id where b.status<>c.status returning id
        ) select id,status from changed`,
    ]);
    if(!(tx[0] as unknown[])[0]||!(tx[1] as unknown[])[0]||!(tx[2] as unknown[])[0]||!(tx[3] as unknown[])[0]||!(tx[4] as unknown[])[0]) throw new Error('SAVING_TRANSFER_PRECONDITION_FAILED');
    const summary=await this.getSummary(userId,String(ar.cycle_id));
    const b=await balances(userId,input.fromAccountId,input.toAccountId);
    if(!summary) throw new Error('SAVING_ALLOCATION_NOT_FOUND');
    return {savingTransferId:transferId,savingAllocationId:input.savingAllocationId,outTransactionId:outId,inTransactionId:inId,amount:input.amount,transactionDate:input.transactionDate,fromAccountId:input.fromAccountId,toAccountId:input.toAccountId,fromAccountBalanceAfter:b.from,toAccountBalanceAfter:b.to,actualTransferredAmount:summary.actualTransferredAmount,remainingToTransfer:summary.remainingToTransfer,allocationStatus:summary.status,totalLiquidityChange:'0.00',postedAt:postedAt.toISOString()};
  }
}
export const savingRepository=new SavingRepository();
