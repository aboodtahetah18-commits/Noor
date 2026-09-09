import { rawSql } from '@/infrastructure/db/client';
import { Money, sumMoney } from '@/financial-engine/money';
import { getSalaryAllocationOptimizer } from '@/features/budget-optimizer/queries/get-salary-allocation-optimizer';

export type SurplusDestinationKind='EMERGENCY'|'GOAL'|'INTERNAL_RECOVERY'|'INVESTMENT'|'CYCLE_RESERVE';
export type SurplusDestination={
  key:string;
  kind:SurplusDestinationKind;
  label:string;
  reason:string;
  rank:number;
  suggestedCap:string|null;
  currentDraft:string;
  goalId:string|null;
  emergencyFundId:string|null;
  fundingSourceId:string|null;
  investmentAccountId:string|null;
};
const money=(value:unknown)=>Money.parse(String(value??'0'));

export async function getSurplusRouting(userId:string){
  const optimizer=await getSalaryAllocationOptimizer(userId);
  if(!optimizer) return null;
  const cycleId=String(optimizer.cycle.id);
  const [emergencyRows,goalRows,recoveryRows,investmentRows,draftRows]=await Promise.all([
    rawSql`
      select ef.id,ef.name,ef.target_amount::text as "targetAmount",
        coalesce(sum(ab.balance),0)::text as "currentBalance"
      from public.emergency_funds ef
      left join public.accounts a on a.user_id=ef.user_id and a.financial_role='EMERGENCY_FUND' and a.is_active=true
      left join public.account_balances_v ab on ab.account_id=a.id and ab.user_id=a.user_id
      where ef.user_id=${userId}
      group by ef.id,ef.name,ef.target_amount
      limit 1`,
    rawSql`
      select g.id,g.name,g.target_date::text as "targetDate",
        greatest(gcc.required_amount-gcc.approved_amount,0)::text as "cycleGap"
      from public.goal_cycle_commitments gcc
      join public.financial_goals g on g.id=gcc.goal_id and g.user_id=gcc.user_id
      where gcc.user_id=${userId} and gcc.cycle_id=${cycleId}
        and gcc.status in ('APPROVED','FUNDED')
        and gcc.required_amount>gcc.approved_amount
      order by g.target_date nulls last,g.priority nulls last,g.name`,
    rawSql`
      select s.id,s.source_type as "sourceType",a.name as "accountName",
        greatest(
          coalesce((select sum(x.amount+x.growth_contribution) from public.internal_funding_expense_allocations x where x.user_id=s.user_id and x.source_id=s.id),0)
          - coalesce((select sum(r.amount) from public.internal_funding_repayments r where r.user_id=s.user_id and r.source_id=s.id and r.status='PAID'),0),
          0
        )::text as "outstanding"
      from public.internal_funding_sources s
      join public.accounts a on a.id=s.account_id and a.user_id=s.user_id
      join public.internal_funding_cases c on c.id=s.case_id and c.user_id=s.user_id
      where s.user_id=${userId} and c.status in ('ACTIVE','RECOVERY') and s.used_amount>0
      order by case when s.source_type='EMERGENCY' then 1 else 2 end,s.priority,a.name`,
    rawSql`
      select a.id,a.name,coalesce(ab.balance,0)::text as balance
      from public.accounts a
      left join public.account_balances_v ab on ab.account_id=a.id and ab.user_id=a.user_id
      where a.user_id=${userId} and a.is_active=true and a.financial_role='INVESTMENT'
      order by a.name`,
    rawSql`
      select destination_type as "destinationType",goal_id as "goalId",emergency_fund_id as "emergencyFundId",
        internal_funding_source_id as "fundingSourceId",investment_account_id as "investmentAccountId",amount::text as amount
      from public.cycle_surplus_routing_drafts
      where user_id=${userId} and cycle_id=${cycleId} and status='DRAFT'`,
  ]);

  const draftMap=new Map<string,Money>();
  for(const row of draftRows){
    const type=String(row.destinationType);
    const ref=String(row.goalId??row.emergencyFundId??row.fundingSourceId??row.investmentAccountId??'reserve');
    draftMap.set(`${type}:${ref}`,money(row.amount));
  }
  const destinations:SurplusDestination[]=[];
  const ef=emergencyRows[0];
  if(ef){
    const target=ef.targetAmount===null?null:money(ef.targetAmount);
    const current=money(ef.currentBalance);
    const gap=target===null?null:target.subtract(current).max(Money.zero());
    const ref=String(ef.id);
    destinations.push({key:`EMERGENCY:${ref}`,kind:'EMERGENCY',label:String(ef.name??'صندوق الطوارئ'),reason:gap===null?'تعزيز احتياطي الطوارئ':'إعادة بناء الطوارئ حتى الهدف المحدد',rank:10,suggestedCap:gap?.toString()??null,currentDraft:(draftMap.get(`EMERGENCY:${ref}`)??Money.zero()).toString(),goalId:null,emergencyFundId:ref,fundingSourceId:null,investmentAccountId:null});
  }
  for(const row of goalRows){
    const ref=String(row.id); const gap=money(row.cycleGap).max(Money.zero());
    destinations.push({key:`GOAL:${ref}`,kind:'GOAL',label:`هدف: ${String(row.name)}`,reason:row.targetDate?`يوجد نقص في مساهمة هذه الدورة قبل ${String(row.targetDate)}`:'يوجد نقص في مساهمة الهدف لهذه الدورة',rank:20,suggestedCap:gap.toString(),currentDraft:(draftMap.get(`GOAL:${ref}`)??Money.zero()).toString(),goalId:ref,emergencyFundId:null,fundingSourceId:null,investmentAccountId:null});
  }
  for(const row of recoveryRows){
    const ref=String(row.id); const outstanding=money(row.outstanding).max(Money.zero());
    if(!outstanding.isPositive()) continue;
    const emergency=String(row.sourceType)==='EMERGENCY';
    destinations.push({key:`INTERNAL_RECOVERY:${ref}`,kind:'INTERNAL_RECOVERY',label:`استرداد ${emergency?'الطوارئ':'الاستثمار'} · ${String(row.accountName)}`,reason:emergency?'إعادة جاهزية حساب الطوارئ أولًا':'إعادة المبلغ المستخدم من المحفظة الاستثمارية',rank:emergency?30:40,suggestedCap:outstanding.toString(),currentDraft:(draftMap.get(`INTERNAL_RECOVERY:${ref}`)??Money.zero()).toString(),goalId:null,emergencyFundId:null,fundingSourceId:ref,investmentAccountId:null});
  }
  for(const row of investmentRows){
    const ref=String(row.id);
    destinations.push({key:`INVESTMENT:${ref}`,kind:'INVESTMENT',label:`استثمار: ${String(row.name)}`,reason:'توجيه جزء من الفائض للاستثمار بعد الاحتياجات الأعلى أولوية',rank:50,suggestedCap:null,currentDraft:(draftMap.get(`INVESTMENT:${ref}`)??Money.zero()).toString(),goalId:null,emergencyFundId:null,fundingSourceId:null,investmentAccountId:ref});
  }
  destinations.push({key:'CYCLE_RESERVE:reserve',kind:'CYCLE_RESERVE',label:'احتياطي داخل الدورة',reason:'إبقاء جزء من الفائض غير ملتزم لمواجهة تغيرات الدورة',rank:60,suggestedCap:null,currentDraft:(draftMap.get('CYCLE_RESERVE:reserve')??Money.zero()).toString(),goalId:null,emergencyFundId:null,fundingSourceId:null,investmentAccountId:null});
  destinations.sort((a,b)=>a.rank-b.rank||a.label.localeCompare(b.label,'ar'));
  const totalDraft=sumMoney(destinations.map(d=>money(d.currentDraft)));
  const availableSurplus=money(optimizer.surplus).max(Money.zero());
  return {...optimizer,availableSurplus:availableSurplus.toString(),destinations,totalDraft:totalDraft.toString(),unassignedSurplus:availableSurplus.subtract(totalDraft).max(Money.zero()).toString(),overAssigned:totalDraft.subtract(availableSurplus).max(Money.zero()).toString()};
}
