import { rawSql } from '@/infrastructure/db/client';

/**
 * Assigns the next unpaid installment of every recovery source to a financial cycle.
 * The assignment is planning metadata only; it never creates a transfer or repayment.
 * If an older installment is already assigned to an earlier cycle and remains unpaid,
 * it stays overdue and is not silently moved forward.
 */
export async function assignRecoveryInstallmentsToCycle(userId:string,cycleId:string){
  const cycleRows=await rawSql`select id from public.financial_cycles where id=${cycleId}::uuid and user_id=${userId} and status='ACTIVE' limit 1`;
  if(!cycleRows[0]) return {assignedSources:0};

  const sources=await rawSql`
    select s.id as "sourceId"
    from public.internal_funding_sources s
    join public.internal_funding_cases c on c.id=s.case_id and c.user_id=s.user_id
    where s.user_id=${userId} and c.status='RECOVERY'
      and exists(select 1 from public.internal_funding_recovery_schedule rs where rs.user_id=s.user_id and rs.source_id=s.id and rs.status='PLANNED')
      and not exists(select 1 from public.internal_funding_recovery_schedule paid where paid.user_id=s.user_id and paid.source_id=s.id and paid.cycle_id=${cycleId}::uuid and paid.status='PAID')
      and not exists(select 1 from public.internal_funding_recovery_schedule due_now where due_now.user_id=s.user_id and due_now.source_id=s.id and due_now.due_cycle_id=${cycleId}::uuid and due_now.status='PLANNED')`;

  let assignedSources=0;
  for(const row of sources){
    const sourceId=String(row.sourceId);
    const next=await rawSql`
      select min(installment_number)::int as n
      from public.internal_funding_recovery_schedule
      where user_id=${userId} and source_id=${sourceId}::uuid and status='PLANNED'`;
    const installment=Number(next[0]?.n??0);
    if(!installment) continue;

    const existingDue=await rawSql`
      select due_cycle_id as "dueCycleId"
      from public.internal_funding_recovery_schedule
      where user_id=${userId} and source_id=${sourceId}::uuid and installment_number=${installment} and status='PLANNED'
      order by category_id limit 1`;
    if(existingDue[0]?.dueCycleId) continue;

    const updated=await rawSql`
      update public.internal_funding_recovery_schedule
      set due_cycle_id=${cycleId}::uuid,due_assigned_at=now(),updated_at=now()
      where user_id=${userId} and source_id=${sourceId}::uuid and installment_number=${installment} and status='PLANNED' and due_cycle_id is null
      returning id`;
    if(updated.length) assignedSources++;
  }
  return {assignedSources};
}
