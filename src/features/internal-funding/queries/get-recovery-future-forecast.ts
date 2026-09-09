import { Money, sumMoney } from '@/financial-engine/money';
import { rawSql } from '@/infrastructure/db/client';

export type RecoveryForecastSource={
  sourceId:string;
  sourceType:'EMERGENCY'|'INVESTMENT';
  sourceAccountName:string;
  caseId:string;
  caseTitle:string;
  installmentNumber:number;
  principalAmount:string;
  growthAmount:string;
  totalAmount:string;
  dueState:'OVERDUE'|'CURRENT'|'PROJECTED';
};

export type RecoveryForecastCycle={
  cycleIndex:number;
  projectedStartDate:string|null;
  label:string;
  principalAmount:string;
  growthAmount:string;
  totalAmount:string;
  baselineExpectedIncome:string|null;
  capacityAfterRecoveryOnly:string|null;
  sources:RecoveryForecastSource[];
};

export type RecoveryFutureForecast={
  activeCycleId:string;
  activeCycleName:string;
  activeCycleStartDate:string;
  nextIncomeDate:string;
  baselineExpectedIncome:string|null;
  totalOutstanding:string;
  totalPrincipal:string;
  totalGrowth:string;
  projectedCycles:RecoveryForecastCycle[];
};

export async function getRecoveryFutureForecast(userId:string):Promise<RecoveryFutureForecast|null>{
  const cycleRows=await rawSql`
    select c.id,c.name,c.start_date::text as "startDate",c.expected_next_income_date::text as "nextIncomeDate",
      nullif(coalesce(sum(e.expected_amount),0),0)::text as "baselineExpectedIncome"
    from public.financial_cycles c
    left join public.expected_incomes e on e.user_id=c.user_id and e.cycle_id=c.id
    where c.user_id=${userId} and c.status='ACTIVE'
    group by c.id,c.name,c.start_date,c.expected_next_income_date
    order by c.start_date desc limit 1`;
  const cycle=cycleRows[0];
  if(!cycle)return null;

  const rows=await rawSql`
    select rs.source_id as "sourceId",rs.installment_number as "installmentNumber",
      sum(rs.principal_amount)::text as "principalAmount",sum(rs.growth_amount)::text as "growthAmount",sum(rs.total_amount)::text as "totalAmount",
      min(rs.due_cycle_id::text) as "dueCycleId",min(dc.start_date)::text as "dueCycleStartDate",
      s.source_type as "sourceType",a.name as "sourceAccountName",c.id as "caseId",c.title as "caseTitle"
    from public.internal_funding_recovery_schedule rs
    join public.internal_funding_sources s on s.id=rs.source_id and s.user_id=rs.user_id
    join public.accounts a on a.id=s.account_id and a.user_id=s.user_id
    join public.internal_funding_cases c on c.id=rs.case_id and c.user_id=rs.user_id and c.status='RECOVERY'
    left join public.financial_cycles dc on dc.id=rs.due_cycle_id and dc.user_id=rs.user_id
    where rs.user_id=${userId} and rs.status='PLANNED'
    group by rs.source_id,rs.installment_number,s.source_type,a.name,c.id,c.title
    order by rs.source_id,rs.installment_number`;

  if(!rows.length)return {
    activeCycleId:String(cycle.id),activeCycleName:String(cycle.name),activeCycleStartDate:String(cycle.startDate),nextIncomeDate:String(cycle.nextIncomeDate),
    baselineExpectedIncome:cycle.baselineExpectedIncome==null?null:Money.parse(String(cycle.baselineExpectedIncome)).toString(),totalOutstanding:'0.00',totalPrincipal:'0.00',totalGrowth:'0.00',projectedCycles:[],
  };

  const bySource=new Map<string,typeof rows>();
  for(const row of rows){const id=String(row.sourceId);const list=bySource.get(id)??[];list.push(row);bySource.set(id,list)}

  const slots=new Map<number,RecoveryForecastSource[]>();
  for(const sourceRows of bySource.values()){
    sourceRows.sort((a,b)=>Number(a.installmentNumber)-Number(b.installmentNumber));
    sourceRows.forEach((r,index)=>{
      const dueCycleId=r.dueCycleId?String(r.dueCycleId):null;
      const dueStart=r.dueCycleStartDate?String(r.dueCycleStartDate):null;
      const isPastAssigned=Boolean(dueCycleId&&dueCycleId!==String(cycle.id)&&dueStart&&dueStart<String(cycle.startDate));
      const dueState:RecoveryForecastSource['dueState']=isPastAssigned?'OVERDUE':index===0?'CURRENT':'PROJECTED';
      const slot=index;
      const item:RecoveryForecastSource={sourceId:String(r.sourceId),sourceType:String(r.sourceType)==='EMERGENCY'?'EMERGENCY':'INVESTMENT',sourceAccountName:String(r.sourceAccountName),caseId:String(r.caseId),caseTitle:String(r.caseTitle),installmentNumber:Number(r.installmentNumber),principalAmount:Money.parse(String(r.principalAmount??'0.00')).toString(),growthAmount:Money.parse(String(r.growthAmount??'0.00')).toString(),totalAmount:Money.parse(String(r.totalAmount??'0.00')).toString(),dueState};
      const list=slots.get(slot)??[];list.push(item);slots.set(slot,list);
    });
  }

  const maxSlot=Math.max(...slots.keys());
  const dateRows=await rawSql`
    select gs::int as idx,
      case when gs=0 then ${String(cycle.startDate)}::date else (${String(cycle.nextIncomeDate)}::date + ((gs-1)::text||' month')::interval)::date end::text as d
    from generate_series(0,${maxSlot}) gs order by gs`;
  const dateBySlot=new Map(dateRows.map(r=>[Number(r.idx),String(r.d)]));
  const baseline=cycle.baselineExpectedIncome==null?null:Money.parse(String(cycle.baselineExpectedIncome));
  const projectedCycles:RecoveryForecastCycle[]=[];
  for(let i=0;i<=maxSlot;i++){
    const items=slots.get(i)??[];
    if(!items.length)continue;
    const principal=sumMoney(items.map((x)=>Money.parse(x.principalAmount)));
    const growth=sumMoney(items.map((x)=>Money.parse(x.growthAmount)));
    const total=sumMoney(items.map((x)=>Money.parse(x.totalAmount)));
    projectedCycles.push({cycleIndex:i,projectedStartDate:dateBySlot.get(i)??null,label:i===0?'الدورة الحالية':`الدورة المستقبلية ${i}`,principalAmount:principal.toString(),growthAmount:growth.toString(),totalAmount:total.toString(),baselineExpectedIncome:baseline?.toString()??null,capacityAfterRecoveryOnly:baseline==null?null:baseline.subtract(total).max(Money.zero()).toString(),sources:items});
  }

  return {
    activeCycleId:String(cycle.id),activeCycleName:String(cycle.name),activeCycleStartDate:String(cycle.startDate),nextIncomeDate:String(cycle.nextIncomeDate),baselineExpectedIncome:baseline?.toString()??null,
    totalOutstanding:sumMoney(projectedCycles.map((c)=>Money.parse(c.totalAmount))).toString(),totalPrincipal:sumMoney(projectedCycles.map((c)=>Money.parse(c.principalAmount))).toString(),totalGrowth:sumMoney(projectedCycles.map((c)=>Money.parse(c.growthAmount))).toString(),projectedCycles,
  };
}
