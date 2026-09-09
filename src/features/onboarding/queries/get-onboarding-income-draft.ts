import { rawSql } from '@/infrastructure/db/client';
export async function getOnboardingIncomeDraft(userId:string,cycleId:string){
 const rows=await rawSql`select c.id cycle_id,c.name cycle_name,c.start_date::text start_date,c.expected_next_income_date::text expected_next_income_date,
   ei.source_name,ei.expected_amount::text expected_amount,ei.expected_date::text expected_date,ei.income_kind,ei.is_primary
   from public.financial_cycles c left join lateral (
     select * from public.expected_incomes where user_id=${userId} and cycle_id=c.id order by is_primary desc,created_at limit 1
   ) ei on true where c.id=${cycleId} and c.user_id=${userId} limit 1`;
 if(!rows[0])return null;const r=rows[0];return{cycleId:String(r.cycle_id),cycleName:String(r.cycle_name),startDate:String(r.start_date),expectedNextIncomeDate:String(r.expected_next_income_date),sourceName:String(r.source_name??''),expectedAmount:String(r.expected_amount??''),expectedDate:String(r.expected_date??''),incomeKind:String(r.income_kind??'SALARY'),isPrimary:Boolean(r.is_primary)};
}
