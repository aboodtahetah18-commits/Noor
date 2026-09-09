import { Money } from '@/financial-engine/money';
import { rawSql } from '@/infrastructure/db/client';
import { getTripFundingReadiness } from './get-trip-funding-readiness';

export type GapResolutionFlexibleCategory={
  categoryId:string;
  categoryName:string;
  plannedAmount:string;
  actualAmount:string;
  availableHeadroom:string;
};
export type GapResolutionSource={
  accountId:string;
  accountName:string;
  bankName:string|null;
  financialRole:'EMERGENCY_FUND'|'INVESTMENT';
  availableBalance:string;
};
export type TripGapResolution={
  eventId:string;
  goalId:string;
  title:string;
  fundingGap:string;
  flexibleCategories:GapResolutionFlexibleCategory[];
  flexibleHeadroomTotal:string;
  emergencySources:GapResolutionSource[];
  emergencyAvailableTotal:string;
  investmentSources:GapResolutionSource[];
  investmentAvailableTotal:string;
  existingFundingCaseId:string|null;
};

export async function getTripGapResolution(userId:string,eventId:string):Promise<TripGapResolution|null>{
  const readiness=await getTripFundingReadiness(userId,eventId);
  if(!readiness)return null;
  const eventRows=await rawSql`select e.id,e.goal_id as "goalId",e.title
    from public.goal_events e where e.user_id=${userId} and e.id=${eventId}::uuid limit 1`;
  const event=eventRows[0] as {id:string;goalId:string;title:string}|undefined;
  if(!event)return null;
  const gap=readiness.fundingGap?Money.parse(readiness.fundingGap):Money.zero();
  const flexible=await rawSql`select ba.category_id as "categoryId",bc.name as "categoryName",ba.planned_amount::text as "plannedAmount",
      coalesce(sum(t.amount) filter(where t.status='POSTED' and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')),0)::text as "actualAmount",
      greatest(ba.planned_amount-coalesce(sum(t.amount) filter(where t.status='POSTED' and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')),0),0)::text as "availableHeadroom"
    from public.financial_cycles c
    join public.financial_plans p on p.cycle_id=c.id and p.user_id=c.user_id and p.status='ACTIVE_PLAN'
    join public.plan_versions pv on pv.plan_id=p.id and pv.is_current=true
    join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.allocation_type='FLEXIBLE'
    join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=c.user_id and bc.category_group='FLEXIBLE'
    left join public.transactions t on t.user_id=c.user_id and t.cycle_id=c.id and t.category_id=ba.category_id
    where c.user_id=${userId} and c.status='ACTIVE'
    group by ba.category_id,bc.name,ba.planned_amount
    having greatest(ba.planned_amount-coalesce(sum(t.amount) filter(where t.status='POSTED' and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')),0),0)>0
    order by greatest(ba.planned_amount-coalesce(sum(t.amount) filter(where t.status='POSTED' and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')),0),0) desc,bc.name`;
  const sourceRows=await rawSql`select a.id as "accountId",a.name as "accountName",a.bank_name as "bankName",a.financial_role as "financialRole",
      greatest(coalesce(v.balance,0),0)::text as "availableBalance"
    from public.accounts a left join public.account_balances_v v on v.account_id=a.id and v.user_id=a.user_id
    where a.user_id=${userId} and a.is_active=true and a.financial_role in ('EMERGENCY_FUND','INVESTMENT') and greatest(coalesce(v.balance,0),0)>0
    order by case when a.financial_role='EMERGENCY_FUND' then 10 else 20 end,a.created_at`;
  const existing=await rawSql`select id from public.internal_funding_cases where user_id=${userId} and goal_event_id=${eventId}::uuid and status in ('PLANNING','ACTIVE','RECOVERY') limit 1`;
  const flex=flexible.map(r=>({categoryId:String(r.categoryId),categoryName:String(r.categoryName),plannedAmount:String(r.plannedAmount),actualAmount:String(r.actualAmount),availableHeadroom:String(r.availableHeadroom)}));
  const src=sourceRows.map(r=>({accountId:String(r.accountId),accountName:String(r.accountName),bankName:r.bankName?String(r.bankName):null,financialRole:String(r.financialRole) as 'EMERGENCY_FUND'|'INVESTMENT',availableBalance:String(r.availableBalance)}));
  const sum=(xs:{availableBalance?:string;availableHeadroom?:string}[],key:'availableBalance'|'availableHeadroom')=>xs.reduce((m,x)=>m.add(Money.parse(String(x[key]??'0'))),Money.zero()).toString();
  return{eventId,goalId:event.goalId,title:event.title,fundingGap:gap.toString(),flexibleCategories:flex,flexibleHeadroomTotal:sum(flex,'availableHeadroom'),emergencySources:src.filter(x=>x.financialRole==='EMERGENCY_FUND'),emergencyAvailableTotal:sum(src.filter(x=>x.financialRole==='EMERGENCY_FUND'),'availableBalance'),investmentSources:src.filter(x=>x.financialRole==='INVESTMENT'),investmentAvailableTotal:sum(src.filter(x=>x.financialRole==='INVESTMENT'),'availableBalance'),existingFundingCaseId:existing[0]?String(existing[0].id):null};
}
