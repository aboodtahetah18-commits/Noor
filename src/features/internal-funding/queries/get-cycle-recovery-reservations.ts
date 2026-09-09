import { rawSql } from '@/infrastructure/db/client';

export type CycleRecoveryReservation={
  caseId:string;
  caseTitle:string;
  sourceId:string;
  sourceType:'EMERGENCY'|'INVESTMENT';
  sourceAccountName:string;
  installmentNumber:number;
  principalAmount:string;
  growthAmount:string;
  totalAmount:string;
  dueCycleId:string|null;
  dueCycleName:string|null;
  dueCycleStatus:string|null;
  isOverdue:boolean;
};

export async function getCycleRecoveryReservations(userId:string,cycleId:string):Promise<CycleRecoveryReservation[]>{
  const rows=await rawSql`
    with paid_current as (
      select distinct source_id
      from public.internal_funding_recovery_schedule
      where user_id=${userId} and cycle_id=${cycleId}::uuid and status='PAID'
    ), next_installment as (
      select source_id,min(installment_number)::int as installment_number
      from public.internal_funding_recovery_schedule
      where user_id=${userId} and status='PLANNED'
      group by source_id
    )
    select c.id as "caseId",c.title as "caseTitle",s.id as "sourceId",s.source_type as "sourceType",
      a.name as "sourceAccountName",rs.installment_number as "installmentNumber",
      sum(rs.principal_amount)::text as "principalAmount",sum(rs.growth_amount)::text as "growthAmount",sum(rs.total_amount)::text as "totalAmount",
      min(rs.due_cycle_id::text) as "dueCycleId",min(dc.name) as "dueCycleName",min(dc.status) as "dueCycleStatus",
      bool_or(rs.due_cycle_id is not null and rs.due_cycle_id<>${cycleId}::uuid) as "isOverdue"
    from next_installment ni
    join public.internal_funding_recovery_schedule rs on rs.user_id=${userId} and rs.source_id=ni.source_id and rs.installment_number=ni.installment_number and rs.status='PLANNED'
    join public.internal_funding_sources s on s.id=rs.source_id and s.user_id=rs.user_id
    join public.internal_funding_cases c on c.id=rs.case_id and c.user_id=rs.user_id and c.status='RECOVERY'
    join public.accounts a on a.id=s.account_id and a.user_id=s.user_id
    left join public.financial_cycles dc on dc.id=rs.due_cycle_id and dc.user_id=rs.user_id
    where not exists(select 1 from paid_current pc where pc.source_id=rs.source_id)
    group by c.id,c.title,s.id,s.source_type,a.name,rs.installment_number
    order by case when s.source_type='EMERGENCY' then 0 else 1 end,c.title,a.name`;
  return rows.map(r=>({
    caseId:String(r.caseId),caseTitle:String(r.caseTitle),sourceId:String(r.sourceId),sourceType:String(r.sourceType)==='EMERGENCY'?'EMERGENCY':'INVESTMENT',sourceAccountName:String(r.sourceAccountName),installmentNumber:Number(r.installmentNumber),principalAmount:String(r.principalAmount??'0.00'),growthAmount:String(r.growthAmount??'0.00'),totalAmount:String(r.totalAmount??'0.00'),dueCycleId:r.dueCycleId?String(r.dueCycleId):null,dueCycleName:r.dueCycleName?String(r.dueCycleName):null,dueCycleStatus:r.dueCycleStatus?String(r.dueCycleStatus):null,isOverdue:Boolean(r.isOverdue),
  }));
}
