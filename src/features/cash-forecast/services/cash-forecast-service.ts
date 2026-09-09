import { rawSql } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import { calculateSafeToSpend } from '@/financial-engine/safe-to-spend';
import { getActiveFinancialBufferPolicy, calculateRequiredFinancialBuffer } from '@/features/financial-buffer/services/financial-buffer-service';

export type CashForecastRisk = 'HEALTHY'|'WATCH'|'RISK';
export type CashGuidanceRecommendation = {
  code:'PROTECT_BUFFER'|'REVIEW_VARIABLE_PACE'|'ON_TRACK';
  message:string;
};

export type CashForecast = {
  asOfDate:string;
  nextIncomeDate:string;
  elapsedDays:number;
  cycleLengthDays:number;
  remainingDays:number;
  currentLiquidity:string;
  upcomingObligations:string;
  actualCycleIncome:string;
  expectedCycleIncome:string;
  requiredBuffer:string;
  safeUntilIncome:string;
  plannedVariableBudget:string;
  plannedSpendToDate:string;
  actualVariableSpend:string;
  spendVariance:string;
  spendPacePercent:number|null;
  averageDailyVariableSpend:string;
  projectedVariableSpend:string;
  projectedEndBalance:string;
  protectionDeficit:string;
  recommendedDailyLimit:string;
  adaptiveDailyLimit:string;
  risk:CashForecastRisk;
  recommendations:CashGuidanceRecommendation[];
  transferSuggestion:null|{fromAccount:string;toAccount:string;amount:string;reason:string};
  engineVersion:'P56-V1-LINEAR-PACE';
};

function daysBetween(start:string,end:string){
  const a=Date.parse(`${start}T00:00:00Z`); const b=Date.parse(`${end}T00:00:00Z`);
  if(!Number.isFinite(a)||!Number.isFinite(b)) return 0;
  return Math.max(0,Math.ceil((b-a)/86400000));
}

export async function calculateCashForecast(userId:string,cycleId:string,asOfDate?:string):Promise<{success:true;forecast:CashForecast}|{success:false;code:string;message:string}>{
  const policy=await getActiveFinancialBufferPolicy(userId);
  if(!policy)return {success:false,code:'BUFFER_POLICY_REQUIRED',message:'اعتمد قاعدة الاحتياطي المالي أولًا حتى يستطيع النظام حماية الحد الأدنى للسيولة.'};

  const today=asOfDate??new Date().toISOString().slice(0,10);
  const rows=await rawSql`select
    c.start_date::text,
    c.expected_next_income_date::text,
    coalesce((select sum(balance) from public.account_balances_v where user_id=${userId}),0)::text current_liquidity,
    coalesce((select sum(amount) from public.obligation_occurrences
      where user_id=${userId} and status in ('UPCOMING','DUE','OVERDUE')
        and due_date <= c.expected_next_income_date
        and (status='OVERDUE' or due_date >= ${today}::date)),0)::text upcoming_obligations,
    coalesce((select sum(amount) from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and transaction_type='INCOME' and status='POSTED'),0)::text actual_income,
    coalesce((select sum(expected_amount) from public.expected_incomes where user_id=${userId} and cycle_id=${cycleId}::uuid),0)::text expected_income,
    coalesce((select sum(greatest(ba.planned_amount-coalesce(x.actual,0),0)) from public.financial_plans p
      join public.budget_allocations ba on ba.plan_version_id=p.current_version_id and ba.user_id=p.user_id and ba.allocation_type='ESSENTIAL'
      left join lateral (select coalesce(sum(t.amount),0) actual from public.transactions t where t.user_id=p.user_id and t.cycle_id=p.cycle_id and t.category_id=ba.category_id and t.transaction_type='EXPENSE' and t.status='POSTED') x on true
      where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid and p.status in ('ACTIVE_PLAN','REVISED')),0)::text remaining_essential_needs,
    coalesce((select sum(ba.planned_amount) filter(where ba.allocation_type='SAVING') from public.financial_plans p join public.budget_allocations ba on ba.plan_version_id=p.current_version_id and ba.user_id=p.user_id where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid and p.status in ('ACTIVE_PLAN','REVISED')),0)::text protected_savings,
    coalesce((select sum(ba.planned_amount) filter(where ba.allocation_type='EMERGENCY') from public.financial_plans p join public.budget_allocations ba on ba.plan_version_id=p.current_version_id and ba.user_id=p.user_id where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid and p.status in ('ACTIVE_PLAN','REVISED')),0)::text protected_emergency,
    coalesce((select sum(ba.planned_amount) filter(where ba.allocation_type='GOAL') from public.financial_plans p join public.budget_allocations ba on ba.plan_version_id=p.current_version_id and ba.user_id=p.user_id where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid and p.status in ('ACTIVE_PLAN','REVISED')),0)::text protected_goals,
    coalesce((select sum(ba.planned_amount) from public.financial_plans p
      join public.budget_allocations ba on ba.plan_version_id=p.current_version_id and ba.user_id=p.user_id
      where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid and p.status in ('ACTIVE_PLAN','REVISED') and ba.allocation_type='FLEXIBLE'),0)::text planned_variable_budget,
    coalesce((select sum(t.amount) from public.transactions t
      where t.user_id=${userId} and t.cycle_id=${cycleId}::uuid and t.transaction_type='EXPENSE' and t.status='POSTED'
        and t.transaction_date <= ${today}::date and t.obligation_occurrence_id is null
        and t.category_id in (
          select ba.category_id from public.financial_plans p
          join public.budget_allocations ba on ba.plan_version_id=p.current_version_id and ba.user_id=p.user_id
          where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid and p.status in ('ACTIVE_PLAN','REVISED') and ba.allocation_type='FLEXIBLE'
        )),0)::text variable_spend
    from public.financial_cycles c where c.user_id=${userId} and c.id=${cycleId}::uuid limit 1`;
  const r=rows[0] as Record<string,unknown>|undefined;
  if(!r)return {success:false,code:'CYCLE_NOT_FOUND',message:'تعذر العثور على الدورة المالية.'};

  const startDate=String(r.start_date); const nextIncomeDate=String(r.expected_next_income_date);
  const cycleLengthDays=Math.max(1,daysBetween(startDate,nextIncomeDate));
  const elapsedDays=Math.min(cycleLengthDays,Math.max(1,daysBetween(startDate,today)+1));
  const remainingDays=daysBetween(today,nextIncomeDate);
  const liquidity=Money.parse(String(r.current_liquidity??'0'));
  const obligations=Money.parse(String(r.upcoming_obligations??'0'));
  const actualIncome=Money.parse(String(r.actual_income??'0'));
  const expectedIncome=Money.parse(String(r.expected_income??'0'));
  const incomeBasis=actualIncome.isPositive()?actualIncome:expectedIncome;
  const buffer=calculateRequiredFinancialBuffer(policy,incomeBasis);
  const remainingEssentials=Money.parse(String(r.remaining_essential_needs??'0'));
  const protectedSavings=Money.parse(String(r.protected_savings??'0'));
  const protectedEmergency=Money.parse(String(r.protected_emergency??'0'));
  const protectedGoals=Money.parse(String(r.protected_goals??'0'));
  const plannedVariable=Money.parse(String(r.planned_variable_budget??'0'));
  const variableSpend=Money.parse(String(r.variable_spend??'0'));
  const plannedToDate=Money.fromMinorUnits((plannedVariable.minorUnits*BigInt(elapsedDays))/BigInt(cycleLengthDays));
  const spendVariance=variableSpend.subtract(plannedToDate);
  const spendPacePercent=plannedToDate.isPositive()?Number((variableSpend.minorUnits*10000n)/plannedToDate.minorUnits)/100:null;
  const avgDaily=Money.fromMinorUnits(variableSpend.minorUnits/BigInt(elapsedDays));
  const projectedVariable=Money.fromMinorUnits(avgDaily.minorUnits*BigInt(remainingDays));
  const safeResult=calculateSafeToSpend({availableLiquidity:liquidity,reservedUnpaidObligations:obligations,remainingEssentialNeeds:remainingEssentials,protectedSavings,protectedEmergencyAllocation:protectedEmergency,protectedGoalAllocations:protectedGoals,requiredFinancialBuffer:buffer});
  const safe=safeResult.displayAmount;
  const projectedEnd=liquidity.subtract(obligations).subtract(remainingEssentials).subtract(projectedVariable);
  const protectedEnd=protectedSavings.add(protectedEmergency).add(protectedGoals).add(buffer);
  const deficitRaw=protectedEnd.subtract(projectedEnd);
  const deficit=deficitRaw.isPositive()?deficitRaw:Money.zero();
  const daily=remainingDays>0?Money.fromMinorUnits(safe.minorUnits/BigInt(remainingDays)):safe;
  const risk:CashForecastRisk=deficit.isPositive()?'RISK':spendVariance.isPositive()?'WATCH':'HEALTHY';
  const recommendations:CashGuidanceRecommendation[]=[];
  if(deficit.isPositive()) recommendations.push({code:'PROTECT_BUFFER',message:'التوقع الحالي قد يضغط على الاحتياطي المحمي؛ راجع المصروف المرن قبل أي التزام اختياري جديد.'});
  if(spendVariance.isPositive()) recommendations.push({code:'REVIEW_VARIABLE_PACE',message:'الصرف المرن أعلى من خط الإيقاع الحسابي للدورة حتى اليوم. هذه ملاحظة تحليلية وليست أمرًا بخفض أي بند.'});
  if(recommendations.length===0) recommendations.push({code:'ON_TRACK',message:'لا يظهر حاليًا ضغط على الاحتياطي، والصرف المرن لا يتجاوز خط الإيقاع الحسابي للدورة.'});

  // Per-account transfer advice remains disabled until account-level reserve rules are explicit.
  const transferSuggestion:CashForecast['transferSuggestion']=null;

  return {success:true,forecast:{
    asOfDate:today,nextIncomeDate,elapsedDays,cycleLengthDays,remainingDays,currentLiquidity:liquidity.toString(),upcomingObligations:obligations.toString(),
    actualCycleIncome:actualIncome.toString(),expectedCycleIncome:expectedIncome.toString(),requiredBuffer:buffer.toString(),safeUntilIncome:safe.toString(),
    plannedVariableBudget:plannedVariable.toString(),plannedSpendToDate:plannedToDate.toString(),actualVariableSpend:variableSpend.toString(),spendVariance:spendVariance.toString(),spendPacePercent,
    averageDailyVariableSpend:avgDaily.toString(),projectedVariableSpend:projectedVariable.toString(),projectedEndBalance:projectedEnd.toString(),protectionDeficit:deficit.toString(),
    recommendedDailyLimit:daily.toString(),adaptiveDailyLimit:daily.toString(),risk,recommendations,transferSuggestion,engineVersion:'P56-V1-LINEAR-PACE'
  }};
}
