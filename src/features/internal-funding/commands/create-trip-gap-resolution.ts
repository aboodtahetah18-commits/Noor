import { randomUUID } from 'node:crypto';
import { Money } from '@/financial-engine/money';
import { rawSql, type SqlQuery } from '@/infrastructure/db/client';
import { getTripGapResolution } from '@/features/goal-events/queries/get-trip-gap-resolution';

type FlexibleReliefInput={categoryId:string;amount:string};
type SourceInput={accountId:string;amount:string};
export type CreateTripGapResolutionInput={eventId:string;flexibleReliefs:FlexibleReliefInput[];emergencySources:SourceInput[];investmentSources:SourceInput[];recoveryCycleCount:number;notes?:string|null};

function parseNonNegative(value:string){const text=value.trim();if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw new Error('مبلغ غير صالح.');return Money.parse(text)}

export async function createTripGapResolution(userId:string,input:CreateTripGapResolutionInput){
  if(!Number.isInteger(input.recoveryCycleCount)||input.recoveryCycleCount<1||input.recoveryCycleCount>36)throw new Error('عدد دورات الاسترداد يجب أن يكون بين 1 و36.');
  const view=await getTripGapResolution(userId,input.eventId);if(!view)throw new Error('الرحلة غير موجودة.');
  if(view.existingFundingCaseId)throw new Error('يوجد بالفعل تمويل نشط لهذه الرحلة.');
  const gap=Money.parse(view.fundingGap);if(!gap.isPositive())throw new Error('لا توجد فجوة تمويل لهذه الرحلة.');

  const flexMap=new Map(view.flexibleCategories.map(x=>[x.categoryId,x]));
  const emergencyMap=new Map(view.emergencySources.map(x=>[x.accountId,x]));
  const investmentMap=new Map(view.investmentSources.map(x=>[x.accountId,x]));
  let flexibleTotal=Money.zero(),emergencyTotal=Money.zero(),investmentTotal=Money.zero();
  const normalizedFlex:{categoryId:string;relief:Money;previous:Money;proposed:Money}[]=[];
  for(const item of input.flexibleReliefs){const source=flexMap.get(item.categoryId);if(!source)throw new Error('بند مرن غير صالح.');const relief=parseNonNegative(item.amount);if(relief.isZero())continue;const headroom=Money.parse(source.availableHeadroom);if(relief.compare(headroom)>0)throw new Error(`المبلغ المطلوب من بند ${source.categoryName} أكبر من المتاح دون تجاوز الصرف الفعلي.`);const previous=Money.parse(source.plannedAmount);const proposed=previous.subtract(relief);normalizedFlex.push({categoryId:item.categoryId,relief,previous,proposed});flexibleTotal=flexibleTotal.add(relief)}
  for(const item of input.emergencySources){const source=emergencyMap.get(item.accountId);if(!source)throw new Error('حساب طوارئ غير صالح.');const amount=parseNonNegative(item.amount);if(amount.compare(Money.parse(source.availableBalance))>0)throw new Error('مبلغ الطوارئ أكبر من الرصيد المتاح.');emergencyTotal=emergencyTotal.add(amount)}
  for(const item of input.investmentSources){const source=investmentMap.get(item.accountId);if(!source)throw new Error('حساب استثماري غير صالح.');const amount=parseNonNegative(item.amount);if(amount.compare(Money.parse(source.availableBalance))>0)throw new Error('مبلغ الاستثمار أكبر من الرصيد المتاح.');investmentTotal=investmentTotal.add(amount)}
  const total=flexibleTotal.add(emergencyTotal).add(investmentTotal);if(total.compare(gap)!==0)throw new Error(`مجموع حلول الفجوة يجب أن يساوي ${gap.toString()} ريال.`);

  const eventRows=await rawSql`select e.goal_id as "goalId",e.title,e.destination_city as "destinationCity",e.starts_at::date::text as "startsOn",e.ends_at::date::text as "endsOn"
    from public.goal_events e where e.user_id=${userId} and e.id=${input.eventId}::uuid limit 1`;
  const e=eventRows[0];if(!e)throw new Error('الرحلة غير موجودة.');
  let planId:string|null=null;
  if(normalizedFlex.length){
    const planRows=await rawSql`select p.id from public.financial_cycles c join public.financial_plans p on p.cycle_id=c.id and p.user_id=c.user_id where c.user_id=${userId} and c.status='ACTIVE' and p.status='ACTIVE_PLAN' limit 1`;
    if(!planRows[0])throw new Error('لا توجد خطة مالية نشطة لتسجيل تخفيض البنود المرنة المقترح.');
    planId=String(planRows[0].id);
  }
  const caseId=randomUUID();
  const internalTotal=emergencyTotal.add(investmentTotal);
  const statements:SqlQuery[]=[rawSql`insert into public.internal_funding_cases(id,user_id,goal_id,goal_event_id,case_type,title,destination_city,status,approved_amount,growth_rate,starts_on,ends_on,notes,recovery_cycle_count,recovery_strategy)
      values(${caseId},${userId},${String(e.goalId)},${input.eventId},'TRIP',${`تمويل فجوة: ${String(e.title)}`},${e.destinationCity??null},'PLANNING',${internalTotal.toString()},0.10,${e.startsOn??null},${e.endsOn??null},${input.notes?.trim()||null},${input.recoveryCycleCount},'PROPORTIONAL_ACTUAL_USE')`];
  let priority=10;
  for(const item of input.emergencySources){const amount=parseNonNegative(item.amount);if(amount.isZero())continue;statements.push(rawSql`insert into public.internal_funding_sources(user_id,case_id,account_id,source_type,priority,approved_amount) values(${userId},${caseId},${item.accountId},'EMERGENCY',${priority++},${amount.toString()})`)}
  priority=20;
  for(const item of input.investmentSources){const amount=parseNonNegative(item.amount);if(amount.isZero())continue;statements.push(rawSql`insert into public.internal_funding_sources(user_id,case_id,account_id,source_type,priority,approved_amount) values(${userId},${caseId},${item.accountId},'INVESTMENT',${priority++},${amount.toString()})`)}
  for(const f of normalizedFlex){statements.push(rawSql`insert into public.internal_funding_flexible_reliefs(user_id,case_id,plan_id,revision_version_id,category_id,previous_amount,proposed_amount,relief_amount,status)
      values(${userId},${caseId},${planId},${null},${f.categoryId},${f.previous.toString()},${f.proposed.toString()},${f.relief.toString()},'REVISION_PENDING')`)}
  await rawSql.transaction(statements);
  const maximumRecovery=Money.fromMinorUnits((internalTotal.minorUnits*110n+99n)/100n);
  return{caseId,flexibleRelief:flexibleTotal.toString(),internalFundingApproved:internalTotal.toString(),maximumRecoveryIfFullyUsed:maximumRecovery.toString(),recoveryCycleCount:input.recoveryCycleCount,requiresBudgetRevisionApproval:normalizedFlex.length>0,planId};
}
