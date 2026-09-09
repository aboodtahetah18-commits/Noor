import { rawSql } from '@/infrastructure/db/client';

export type ActiveFundingCase = {
  id:string;
  title:string;
  caseType:'TRIP'|'GOAL'|'URGENT'|'CATEGORY'|'OTHER';
  destinationCity:string|null;
  seasonKey:string|null;
  status:'PLANNING'|'ACTIVE'|'RECOVERY';
  approvedAmount:string;
  usedAmount:string;
};

export async function listActiveFundingCases(userId:string):Promise<ActiveFundingCase[]> {
  const rows=await rawSql`
    select c.id,c.title,c.case_type as "caseType",c.destination_city as "destinationCity",c.season_key as "seasonKey",c.status,
      c.approved_amount::text as "approvedAmount",coalesce(sum(s.used_amount),0)::text as "usedAmount"
    from public.internal_funding_cases c
    left join public.internal_funding_sources s on s.case_id=c.id and s.user_id=c.user_id
    where c.user_id=${userId} and c.status in ('PLANNING','ACTIVE','RECOVERY')
    group by c.id
    order by case when c.status='ACTIVE' then 0 when c.status='RECOVERY' then 1 else 2 end,c.created_at desc`;
  return rows as unknown as ActiveFundingCase[];
}
