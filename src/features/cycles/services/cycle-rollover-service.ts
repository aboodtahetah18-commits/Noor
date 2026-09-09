import { randomUUID } from 'node:crypto';
import { rawSql, type SqlQuery } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import { calculatePercentage } from '@/financial-engine/percentage';
import { calculateClosingSafeToSpend } from '@/features/financial-buffer/services/financial-buffer-service';
import { calculateFinancialHealth } from '@/financial-engine/financial-health';
import { emergencyRepository } from '@/repositories/emergency-repository';

type Recommendation={categoryId:string|null;name:string;currentAmount:string;suggestedAmount:string;action:'KEEP'|'INCREASE'|'REDUCE'|'PAUSE'|'ADD';reason:string};

function nextCycleName(startDate:string){
  const d=new Date(`${startDate}T00:00:00Z`);
  return `دورة ${new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn',{month:'long',year:'numeric',timeZone:'UTC'}).format(d)}`;
}

export async function closeAndPrepareNextCycle(userId:string,cycleId:string){
  const rows=await rawSql`select c.id,c.name,c.start_date::text,c.expected_next_income_date::text,c.status,
      r.status review_status,r.bank_reconciliation_ready,r.unresolved_bank_items,r.next_cycle_recommendations
    from public.financial_cycles c
    left join public.cycle_monthly_reviews r on r.user_id=c.user_id and r.cycle_id=c.id
    where c.user_id=${userId} and c.id=${cycleId}::uuid limit 1`;
  const row=rows[0] as Record<string,unknown>|undefined;
  if(!row)return{success:false as const,code:'NOT_FOUND',message:'الدورة غير موجودة'};
  if(String(row.status)!=='CLOSING')return{success:false as const,code:'INVALID_STATE',message:'يجب بدء إغلاق الدورة أولًا'};
  if(String(row.review_status)!=='REVIEWED')return{success:false as const,code:'REVIEW_REQUIRED',message:'احفظ مراجعة الدورة وتوصيات الدورة القادمة أولًا'};
  if(!row.bank_reconciliation_ready||Number(row.unresolved_bank_items??0)>0)return{success:false as const,code:'BANK_RECONCILIATION_REQUIRED',message:'أكمل المصالحة البنكية وحسم العمليات قبل الإغلاق'};

  const safe=await calculateClosingSafeToSpend(userId,cycleId);
  if(!safe.success)return safe;

  const recs=(Array.isArray(row.next_cycle_recommendations)?row.next_cycle_recommendations:[]) as Recommendation[];
  const nextStart=String(row.expected_next_income_date);
  const nextDateRows=await rawSql`select (${nextStart}::date + interval '1 month')::date::text next_income`;
  const nextIncome=String(nextDateRows[0]?.next_income??nextStart);
  const nextCycleId=randomUUID(),nextPlanId=randomUUID(),nextVersionId=randomUUID(),snapshotId=randomUUID(),reviewId=randomUUID();
  const now=new Date().toISOString();

  const metrics=await rawSql`with current_plan as (
      select current_version_id from public.financial_plans where user_id=${userId} and cycle_id=${cycleId}::uuid limit 1
    ) select
      coalesce((select sum(expected_amount) from public.expected_incomes where user_id=${userId} and cycle_id=${cycleId}::uuid),0)::text expected_income,
      coalesce((select sum(amount) from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and transaction_type='INCOME' and status='POSTED'),0)::text actual_income,
      coalesce((select sum(planned_amount) from public.budget_allocations where user_id=${userId} and plan_version_id=(select current_version_id from current_plan)),0)::text planned_expense,
      coalesce((select sum(planned_amount) from public.budget_allocations where user_id=${userId} and plan_version_id=(select current_version_id from current_plan) and allocation_type in ('OBLIGATION','ESSENTIAL','FLEXIBLE')),0)::text planned_consumption,
      greatest(coalesce((select sum(amount) from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') and status='POSTED'),0)-coalesce((select sum(amount) from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and transaction_type='REFUND' and status='POSTED'),0),0)::text actual_expense,
      coalesce((select planned_amount from public.saving_allocations where user_id=${userId} and cycle_id=${cycleId}::uuid order by created_at desc limit 1),0)::text planned_saving,
      coalesce((select sum(amount) from public.saving_transfers where user_id=${userId} and cycle_id=${cycleId}::uuid),0)::text actual_saving,
      coalesce((select sum(amount) from public.emergency_movements where user_id=${userId} and cycle_id=${cycleId}::uuid and movement_type='CONTRIBUTION' and posted_at is not null),0)::text emergency_contribution,
      coalesce((select sum(amount) from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and transaction_type='GOAL_CONTRIBUTION' and status='POSTED'),0)::text goal_contributions,
      coalesce((select sum(balance) from public.account_balances_v where user_id=${userId}),0)::text actual_end_balance,
      coalesce((select count(*) from public.obligation_occurrences where user_id=${userId} and cycle_id=${cycleId}::uuid and status='OVERDUE'),0)::int overdue_obligations,
      coalesce((select sum(amount) from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and transaction_type='EXPENSE' and status='POSTED' and planning_status='UNPLANNED'),0)::text unplanned_expense,
      coalesce((select count(*) from public.financial_goals where user_id=${userId} and status in ('ACTIVE','FINANCIALLY_UNREALISTIC')),0)::int active_goals,
      coalesce((select count(*) from public.financial_goals where user_id=${userId} and status='FINANCIALLY_UNREALISTIC'),0)::int unrealistic_goals`;
  const m=metrics[0]??{};
  const actualIncome=Money.parse(String(m.actual_income??'0'));
  const actualExpense=Money.parse(String(m.actual_expense??'0'));
  const actualSaving=Money.parse(String(m.actual_saving??'0'));
  const surplus=actualIncome.subtract(actualExpense).subtract(actualSaving).max(Money.zero()).toString();
  const deficit=actualExpense.add(actualSaving).subtract(actualIncome).max(Money.zero()).toString();
  const emergency=await emergencyRepository.summary(userId);
  const plannedConsumption=Money.parse(String(m.planned_consumption??'0'));
  const percent=(numerator:Money,denominator:Money)=>calculatePercentage(numerator.minorUnits,denominator.minorUnits)?.percent??null;
  const budgetUtilization=percent(actualExpense,plannedConsumption);
  const unplannedPercent=percent(Money.parse(String(m.unplanned_expense??'0')),actualExpense);
  const health=calculateFinancialHealth({
    expectedDeficit:safe.protectionDeficit,
    budgetUtilizationPercent:budgetUtilization,
    plannedSaving:String(m.planned_saving??'0'),
    actualSaving:String(m.actual_saving??'0'),
    emergencyProgressPercent:emergency?.progressPercent??null,
    overdueObligations:Number(m.overdue_obligations??0),
    unplannedExpensePercent:unplannedPercent,
    activeGoals:Number(m.active_goals??0),
    unrealisticGoals:Number(m.unrealistic_goals??0),
  });

  const statements:SqlQuery[]=[
    rawSql`insert into public.cycle_snapshots(id,user_id,cycle_id,closed_at,expected_income,actual_income,planned_expense,actual_expense,planned_saving,actual_saving,emergency_contribution,goal_contributions,safe_to_spend_final,actual_end_balance,surplus_amount,deficit_amount,financial_health_score,snapshot_data)
      values(${snapshotId},${userId},${cycleId},${now},${m.expected_income??'0'},${m.actual_income??'0'},${m.planned_expense??'0'},${m.actual_expense??'0'},${m.planned_saving??'0'},${m.actual_saving??'0'},${m.emergency_contribution??'0'},${m.goal_contributions??'0'},${safe.safeToSpend},${m.actual_end_balance??'0'},${surplus},${deficit},${health.score},${JSON.stringify({safe_to_spend_status:'FINALIZED',required_financial_buffer:safe.requiredFinancialBuffer,reserved_obligations:safe.reservedObligations,protection_deficit:safe.protectionDeficit,buffer_policy_id:safe.policy.id,financial_health:{score:health.score,status:health.status,method:health.method,dimensions:health.dimensions,engine_version:health.engineVersion},source:'FINALIZED_FINANCIAL_SNAPSHOT'})}::jsonb) returning id`,
    rawSql`insert into public.cycle_category_snapshots(user_id,snapshot_id,category_id,planned_amount,actual_amount,variance_amount,utilization_percent,final_status)
      select ${userId},${snapshotId},ba.category_id,ba.planned_amount,coalesce(a.actual,0),ba.planned_amount-coalesce(a.actual,0),case when ba.planned_amount>0 then round(coalesce(a.actual,0)/ba.planned_amount*100,2) else null end,case when coalesce(a.actual,0)>ba.planned_amount then 'OVER_BUDGET' else 'NORMAL' end
      from public.financial_plans p join public.budget_allocations ba on ba.user_id=p.user_id and ba.plan_version_id=p.current_version_id
      left join (select category_id,sum(amount) actual from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and status='POSTED' and transaction_type='EXPENSE' group by category_id) a on a.category_id=ba.category_id
      where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid returning id`,
    rawSql`update public.financial_plans set status='CLOSED_PLAN',closed_at=${now} where user_id=${userId} and cycle_id=${cycleId}::uuid and status in ('ACTIVE_PLAN','REVISED') returning id`,
    rawSql`update public.financial_cycles set status='CLOSED',closed_at=${now} where user_id=${userId} and id=${cycleId}::uuid and status='CLOSING' returning id`,
    rawSql`insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason) values(${randomUUID()},${userId},'FINANCIAL_CYCLE',${cycleId},'CLOSING','CLOSED','COMPLETE_CLOSING','إغلاق الدورة بعد اكتمال المراجعة الشهرية المعتمدة') returning id`,
    rawSql`insert into public.cycle_reviews(id,user_id,cycle_id,snapshot_id,status,summary,created_at,ready_at) values(${reviewId},${userId},${cycleId},${snapshotId},'READY','تم إغلاق الدورة وحفظ لقطة نهائية.',${now},${now}) on conflict(cycle_id) do nothing returning id`,
    rawSql`insert into public.financial_cycles(id,user_id,name,start_date,expected_next_income_date,status) values(${nextCycleId},${userId},${nextCycleName(nextStart)},${nextStart},${nextIncome},'DRAFT') returning id`,
    rawSql`insert into public.financial_plans(id,user_id,cycle_id,status) values(${nextPlanId},${userId},${nextCycleId},'PLAN_DRAFT') returning id`,
    rawSql`insert into public.plan_versions(id,user_id,plan_id,version_number,is_current) values(${nextVersionId},${userId},${nextPlanId},1,false) returning id`
  ];

  for(const r of recs){
    if(!r.categoryId||r.action==='PAUSE')continue;
    const amount=/^\d+(?:\.\d{1,2})?$/.test(String(r.suggestedAmount))?String(r.suggestedAmount):String(r.currentAmount);
    statements.push(rawSql`insert into public.budget_allocations(id,user_id,plan_version_id,category_id,planned_amount,allocation_type)
      select ${randomUUID()},${userId},${nextVersionId},ba.category_id,${amount},ba.allocation_type
      from public.financial_plans p join public.budget_allocations ba on ba.plan_version_id=p.current_version_id and ba.user_id=p.user_id
      left join public.plan_item_rules pr on pr.user_id=ba.user_id and pr.category_id=ba.category_id
      where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid and ba.category_id=${r.categoryId}::uuid
        and (pr.id is null or pr.is_active=false or pr.recurrence_kind='MONTHLY'
          or (pr.recurrence_kind='EVERY_N_CYCLES' and mod(greatest(((extract(year from ${nextStart}::date)::int-extract(year from pr.start_cycle_date)::int)*12 + (extract(month from ${nextStart}::date)::int-extract(month from pr.start_cycle_date)::int)),0),pr.interval_cycles)=0)
          or (pr.recurrence_kind='ONE_TIME' and pr.start_cycle_date=${nextStart}::date))
      returning id`);
  }
  statements.push(rawSql`insert into public.saving_allocations(id,user_id,cycle_id,plan_version_id,planned_amount,allocated_amount,status)
    select ${randomUUID()},${userId},${nextCycleId},${nextVersionId},coalesce(sum(planned_amount) filter(where allocation_type='SAVING'),0),0,'PLANNED' from public.budget_allocations where user_id=${userId} and plan_version_id=${nextVersionId} returning id`);
  statements.push(rawSql`update public.cycle_monthly_reviews set status='ROLLED_OVER',closed_cycle_id=${cycleId},next_cycle_id=${nextCycleId},rollover_completed_at=${now},updated_at=${now} where user_id=${userId} and cycle_id=${cycleId}::uuid and status='REVIEWED' returning id`);

  const result=await rawSql.transaction(statements);
  if((result[0] as unknown[]).length!==1||(result[3] as unknown[]).length!==1)return{success:false as const,code:'CONFLICT',message:'تعذر إغلاق الدورة بسبب تعارض في حالتها'};
  return{success:true as const,nextCycleId};
}
