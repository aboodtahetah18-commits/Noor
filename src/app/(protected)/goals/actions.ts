'use server';
import { randomUUID } from 'node:crypto';import { Money } from '@/financial-engine/money';import { rawSql } from '@/infrastructure/db/client';import { redirect } from 'next/navigation';import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';import { createGoal } from '@/features/goals/commands/create-goal';import { linkGoalContextPattern } from '@/features/historical-learning/commands/link-goal-context-pattern';import { activateGoal } from '@/features/goals/commands/activate-goal';import { pauseGoal } from '@/features/goals/commands/pause-goal';import { resumeGoal } from '@/features/goals/commands/resume-goal';import { cancelGoal } from '@/features/goals/commands/cancel-goal';import { contributeGoal } from '@/features/goals/commands/contribute-goal';
export async function createGoalAction(f:FormData){
  const u=await requireAuthenticatedMutationUser();
  const priority=String(f.get('priority')??'');
  const r=await createGoal(u.id,{name:String(f.get('name')??''),targetAmount:String(f.get('targetAmount')??''),openingBalance:String(f.get('openingBalance')??''),startDate:String(f.get('startDate')??''),targetDate:String(f.get('targetDate')??'')||undefined,priority:priority?Number(priority):undefined,idempotencyKey:String(f.get('idempotencyKey')||randomUUID())});
  if(r.success===false){redirect('/goals/new?error='+encodeURIComponent(r.message));return;}
  const goalId=r.data.goalId;
  const patternReason=String(f.get('patternReason')??'').trim();
  if(patternReason){await linkGoalContextPattern(u.id,{goalId,reasonCode:patternReason,customReason:String(f.get('patternCustomReason')??'').trim()||undefined,seasonCode:String(f.get('patternSeason')??'').trim()||undefined,customSeasonName:String(f.get('patternCustomSeason')??'').trim()||undefined,categoryIds:[],sourceCycleCount:0,sourceCategoryCount:0});}
  redirect('/goals?created=1');
}
export async function activateGoalAction(f:FormData){const u=await requireAuthenticatedMutationUser(),id=String(f.get('goalId')??'');const r=await activateGoal(u.id,id);if(!r.success)redirect('/goals/'+id+'?error='+encodeURIComponent(r.message));redirect('/goals/'+id+'?activated=1')}
export async function pauseGoalAction(f:FormData){const u=await requireAuthenticatedMutationUser(),id=String(f.get('goalId')??'');const r=await pauseGoal(u.id,id);if(!r.success)redirect('/goals/'+id+'?error='+encodeURIComponent(r.message));redirect('/goals/'+id+'?paused=1')}
export async function resumeGoalAction(f:FormData){const u=await requireAuthenticatedMutationUser(),id=String(f.get('goalId')??'');const r=await resumeGoal(u.id,id);if(!r.success)redirect('/goals/'+id+'?error='+encodeURIComponent(r.message));redirect('/goals/'+id+'?resumed=1')}
export async function cancelGoalAction(f:FormData){const u=await requireAuthenticatedMutationUser(),id=String(f.get('goalId')??'');const r=await cancelGoal(u.id,id,String(f.get('reason')??'')||undefined);if(!r.success)redirect('/goals/'+id+'?error='+encodeURIComponent(r.message));redirect('/goals/'+id+'?cancelled=1')}
export async function contributeGoalAction(f:FormData){const u=await requireAuthenticatedMutationUser(),id=String(f.get('goalId')??'');const r=await contributeGoal(u.id,{goalId:id,accountId:String(f.get('accountId')??''),amount:String(f.get('amount')??''),transactionDate:String(f.get('transactionDate')??''),idempotencyKey:String(f.get('idempotencyKey')||randomUUID())});if(!r.success)redirect('/goals/'+id+'/contribute?error='+encodeURIComponent(r.message));redirect('/goals/'+id+'?contributed=1')}

export async function approveGoalCycleCommitmentAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser('goal-cycle-commitment');
  const goalId = String(formData.get('goalId') ?? '').trim();
  const requiredAmount = String(formData.get('requiredAmount') ?? '').trim();
  const approvedAmount = String(formData.get('approvedAmount') ?? '').trim().replace(/,/g, '');
  let approved:Money;
  try{approved=Money.parse(approvedAmount);}catch{redirect('/goals?error=مبلغ مساهمة الهدف غير صالح');throw new Error('UNREACHABLE_REDIRECT');}
  if (!goalId || approved.isNegative()) redirect('/goals?error=مبلغ مساهمة الهدف غير صالح');
  try {
    const cycleRows = await rawSql`select id from public.financial_cycles where user_id=${user.id} and status='ACTIVE' order by start_date desc limit 1`;
    if (!cycleRows[0]) throw new Error('لا توجد دورة مالية نشطة.');
    const goalRows = await rawSql`select id from public.financial_goals where id=${goalId}::uuid and user_id=${user.id} and status in ('ACTIVE','FINANCIALLY_UNREALISTIC') limit 1`;
    if (!goalRows[0]) throw new Error('الهدف غير متاح للتخطيط.');
    const cycleId = String(cycleRows[0].id);
    let req=Money.zero();try{req=Money.parse(requiredAmount);}catch{req=Money.zero();}
    await rawSql`insert into public.goal_cycle_commitments(user_id,goal_id,cycle_id,required_amount,approved_amount,status)
      values(${user.id},${goalId},${cycleId},${req.toString()},${approved.toString()},'APPROVED')
      on conflict(user_id,goal_id,cycle_id) do update set required_amount=excluded.required_amount,approved_amount=excluded.approved_amount,status='APPROVED',updated_at=now()`;
    const {syncApprovedPressureDecisionPackagesForUser}=await import('@/features/future-pressure/commands/manage-pressure-decision-packages');
    await syncApprovedPressureDecisionPackagesForUser(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر حفظ مساهمة الهدف';
    redirect(`/goals?error=${encodeURIComponent(message.slice(0,180))}`);
  }
  redirect('/goals?commitment=1');
}

export async function createGoalTripAction(formData:FormData){const u=await requireAuthenticatedMutationUser('goal-trip-create');const goalId=String(formData.get('goalId')??'').trim();try{const {createGoalEvent}=await import('@/features/goal-events/commands/manage-goal-events');await createGoalEvent(u.id,{goalId,title:String(formData.get('title')??''),destinationCity:String(formData.get('destinationCity')??'').trim()||null,startsAt:String(formData.get('startsAt')??'').trim()||null,endsAt:String(formData.get('endsAt')??'').trim()||null,plannedAmount:String(formData.get('plannedAmount')??'').trim()||null,tripContextCode:String(formData.get('tripContextCode')??'STANDARD'),tripContextName:String(formData.get('tripContextName')??'').trim()||null})}catch(error){const message=error instanceof Error?error.message:'تعذر إضافة الرحلة';redirect(`/goals/${goalId}?error=${encodeURIComponent(message.slice(0,180))}`)}redirect(`/goals/${goalId}?tripCreated=1`)}
export async function linkGoalTripTransactionAction(formData:FormData){const u=await requireAuthenticatedMutationUser('goal-trip-link-transaction');const goalId=String(formData.get('goalId')??'').trim();const eventId=String(formData.get('eventId')??'').trim();try{const {linkGoalEventTransaction}=await import('@/features/goal-events/commands/manage-goal-events');await linkGoalEventTransaction(u.id,{eventId,bankStatementRowId:String(formData.get('bankStatementRowId')??'')})}catch(error){const message=error instanceof Error?error.message:'تعذر ربط العملية بالرحلة';redirect(`/goals/${goalId}?error=${encodeURIComponent(message.slice(0,180))}`)}redirect(`/goals/${goalId}?event=${encodeURIComponent(eventId)}&linked=1`)}
export async function closeGoalTripAction(formData:FormData){const u=await requireAuthenticatedMutationUser('goal-trip-close');const eventId=String(formData.get('eventId')??'').trim();const goalId=String(formData.get('goalId')??'').trim();try{const {closeGoalEvent}=await import('@/features/goal-events/commands/manage-goal-events');await closeGoalEvent(u.id,eventId)}catch(error){const message=error instanceof Error?error.message:'تعذر إغلاق الرحلة';redirect(`/goals/${goalId}?error=${encodeURIComponent(message.slice(0,180))}`)}redirect(`/goals/${goalId}?tripClosed=1`)}
export async function setGoalTripBenchmarkAction(formData:FormData){const u=await requireAuthenticatedMutationUser('goal-trip-benchmark');const eventId=String(formData.get('eventId')??'').trim();const goalId=String(formData.get('goalId')??'').trim();const eligible=String(formData.get('eligible')??'')==='1';const note=String(formData.get('note')??'').trim()||null;try{const {setGoalEventBenchmark}=await import('@/features/goal-events/commands/manage-goal-events');await setGoalEventBenchmark(u.id,{eventId,eligible,note})}catch(error){const message=error instanceof Error?error.message:'تعذر تحديث مرجعية الرحلة';redirect(`/goals/${goalId}?error=${encodeURIComponent(message.slice(0,180))}`)}redirect(`/goals/${goalId}?benchmarkUpdated=1`)}

export async function startGoalTripAction(formData:FormData){const u=await requireAuthenticatedMutationUser('goal-trip-start');const goalId=String(formData.get('goalId')??'');const eventId=String(formData.get('eventId')??'');try{const {startGoalEvent}=await import('@/features/goal-events/commands/manage-goal-events');await startGoalEvent(u.id,eventId)}catch(error){const message=error instanceof Error?error.message:'تعذر بدء الرحلة';redirect(`/goals/${goalId}?event=${eventId}&error=${encodeURIComponent(message.slice(0,180))}`)}redirect(`/goals/${goalId}?event=${eventId}&started=1`)}
export async function seedTripPlanFromHistoryAction(formData:FormData){const u=await requireAuthenticatedMutationUser('goal-trip-seed-history');const goalId=String(formData.get('goalId')??'');const eventId=String(formData.get('eventId')??'');let scope='CITY_ONLY';try{const {seedTripPlanFromHistory}=await import('@/features/goal-events/commands/manage-goal-events');const seeded=await seedTripPlanFromHistory(u.id,eventId);scope=seeded.scope}catch(error){const message=error instanceof Error?error.message:'تعذر بناء مرجع الرحلة';redirect(`/goals/${goalId}?event=${eventId}&error=${encodeURIComponent(message.slice(0,180))}`)}redirect(`/goals/${goalId}?event=${eventId}&planSeeded=1&referenceScope=${scope}`)}
export async function updateTripCategoryPlanAction(formData:FormData){const u=await requireAuthenticatedMutationUser('goal-trip-plan-update');const goalId=String(formData.get('goalId')??'');const eventId=String(formData.get('eventId')??'');try{const {updateTripCategoryPlan}=await import('@/features/goal-events/commands/manage-goal-events');await updateTripCategoryPlan(u.id,{eventId,categoryId:String(formData.get('categoryId')??''),plannedAmount:String(formData.get('plannedAmount')??'')})}catch(error){const message=error instanceof Error?error.message:'تعذر تعديل خطة البند';redirect(`/goals/${goalId}?event=${eventId}&error=${encodeURIComponent(message.slice(0,180))}`)}redirect(`/goals/${goalId}?event=${eventId}&planUpdated=1`)}
export async function saveTripVarianceReasonAction(formData:FormData){const u=await requireAuthenticatedMutationUser('goal-trip-variance-reason');const goalId=String(formData.get('goalId')??'');const eventId=String(formData.get('eventId')??'');try{const {saveTripVarianceReason}=await import('@/features/goal-events/commands/manage-goal-events');await saveTripVarianceReason(u.id,{eventId,categoryId:String(formData.get('categoryId')??''),reasonCode:String(formData.get('reasonCode')??''),reasonNote:String(formData.get('reasonNote')??'').trim()||null})}catch(error){const message=error instanceof Error?error.message:'تعذر حفظ سبب الانحراف';redirect(`/goals/${goalId}?event=${eventId}&error=${encodeURIComponent(message.slice(0,180))}`)}redirect(`/goals/${goalId}?event=${eventId}&reasonSaved=1`)}

export async function updateGoalTripContextAction(formData:FormData){const u=await requireAuthenticatedMutationUser('goal-trip-context-update');const goalId=String(formData.get('goalId')??'');const eventId=String(formData.get('eventId')??'');try{const {updateGoalEventContext}=await import('@/features/goal-events/commands/manage-goal-events');await updateGoalEventContext(u.id,{eventId,tripContextCode:String(formData.get('tripContextCode')??'STANDARD'),tripContextName:String(formData.get('tripContextName')??'').trim()||null})}catch(error){const message=error instanceof Error?error.message:'تعذر تحديث نوع الرحلة';redirect(`/goals/${goalId}?event=${eventId}&error=${encodeURIComponent(message.slice(0,180))}`)}redirect(`/goals/${goalId}?event=${eventId}&contextUpdated=1`)}

export async function reserveGoalTripFundingAction(formData:FormData){
  const u=await requireAuthenticatedMutationUser('goal-trip-funding-reserve');
  const goalId=String(formData.get('goalId')??'').trim();
  const eventId=String(formData.get('eventId')??'').trim();
  try{
    const {reserveGoalFundingForTrip}=await import('@/features/goal-events/commands/manage-goal-events');
    await reserveGoalFundingForTrip(u.id,{eventId,reservedAmount:String(formData.get('reservedAmount')??''),notes:String(formData.get('notes')??'').trim()||null});
  }catch(error){
    const message=error instanceof Error?error.message:'تعذر حجز تمويل الرحلة';
    redirect(`/goals/${goalId}?event=${eventId}&error=${encodeURIComponent(message.slice(0,180))}`);
  }
  redirect(`/goals/${goalId}?event=${eventId}&fundingReserved=1`);
}

export async function createTripGapResolutionAction(formData:FormData){
  const u=await requireAuthenticatedMutationUser('trip-gap-resolution-create');
  const goalId=String(formData.get('goalId')??'').trim();
  const eventId=String(formData.get('eventId')??'').trim();
  const flexIds=formData.getAll('flexCategoryId').map(String),flexAmounts=formData.getAll('flexAmount').map(String);
  const emergencyIds=formData.getAll('emergencyAccountId').map(String),emergencyAmounts=formData.getAll('emergencyAmount').map(String);
  const investmentIds=formData.getAll('investmentAccountId').map(String),investmentAmounts=formData.getAll('investmentAmount').map(String);
  const recoveryCycleCount=Number(String(formData.get('recoveryCycleCount')??'0'));
  try{
    const {createTripGapResolution}=await import('@/features/internal-funding/commands/create-trip-gap-resolution');
    const result=await createTripGapResolution(u.id,{eventId,
      flexibleReliefs:flexIds.map((categoryId,i)=>({categoryId,amount:flexAmounts[i]??'0'})),
      emergencySources:emergencyIds.map((accountId,i)=>({accountId,amount:emergencyAmounts[i]??'0'})),
      investmentSources:investmentIds.map((accountId,i)=>({accountId,amount:investmentAmounts[i]??'0'})),
      recoveryCycleCount,notes:String(formData.get('notes')??'').trim()||null});
    const qs=new URLSearchParams({event:eventId,gapPlan:'1',fundingCase:result.caseId});
    redirect(`/goals/${goalId}?${qs.toString()}`);
  }catch(error){
    const message=error instanceof Error?error.message:'تعذر إنشاء خطة حل فجوة التمويل';
    redirect(`/goals/${goalId}?event=${encodeURIComponent(eventId)}&error=${encodeURIComponent(message.slice(0,180))}`);
  }
}

export async function updateGoalTripScheduleAction(formData:FormData){const u=await requireAuthenticatedMutationUser('goal-trip-schedule-update');const goalId=String(formData.get('goalId')??'');const eventId=String(formData.get('eventId')??'');try{const {updateGoalEventSchedule}=await import('@/features/goal-events/commands/manage-goal-events');await updateGoalEventSchedule(u.id,{eventId,startsAt:String(formData.get('startsAt')??''),endsAt:String(formData.get('endsAt')??'').trim()||null})}catch(error){const message=error instanceof Error?error.message:'تعذر تحديث موعد الرحلة';redirect(`/goals/${goalId}?event=${eventId}&error=${encodeURIComponent(message.slice(0,180))}`)}redirect(`/goals/${goalId}?event=${eventId}&scheduleUpdated=1`)}
