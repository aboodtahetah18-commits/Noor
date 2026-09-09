import { randomUUID } from 'node:crypto';
import { rawSql, type SqlQuery } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import { getFinalPlanReview } from '../queries/get-final-plan-review';

export async function finalizeOptimizedCyclePlan(userId:string){
  const review=await getFinalPlanReview(userId);
  if(!review) return {success:false as const,message:'لا توجد دورة مالية نشطة'};
  if(!review.canApprove||!review.plan) return {success:false as const,message:review.blockers[0]??'الخطة غير جاهزة للاعتماد'};

  const cycleId=String(review.cycle.id);
  const planId=review.plan.id;
  const oldVersionId=review.plan.currentVersionId;
  const reductionMap=new Map(review.reductions.map(r=>[r.categoryId,Money.parse(r.reduction)]));
  const snapshot=JSON.stringify({
    engineVersion:'final-plan-review-v1',
    cycleId,
    planId,
    expectedIncome:review.expectedIncome,
    originalDemand:review.originalDemand,
    reductions:review.reductions,
    adjustedDemand:review.adjustedDemand,
    surplus:review.surplus,
    recovery:{total:review.recoveryDemand,principal:review.recoveryPrincipal,growth:review.recoveryGrowth,items:review.recoveryReservations},
    surplusRouting:review.routingRows,
    unassignedSurplus:review.unassignedSurplus,
    approvedAt:new Date().toISOString(),
  });

  if(review.reductions.length===0){
    const finalizationId=randomUUID();
    const rows=await rawSql`with supersede as (
      update public.cycle_plan_finalizations set status='SUPERSEDED'
      where user_id=${userId} and cycle_id=${cycleId} and status='APPROVED'
      returning id
    ), applied_routes as (
      update public.cycle_surplus_routing_drafts set status='APPLIED',updated_at=now()
      where user_id=${userId} and cycle_id=${cycleId} and status='DRAFT'
      returning id
    ), finalization as (
      insert into public.cycle_plan_finalizations(id,user_id,cycle_id,plan_id,plan_version_id,expected_income,original_demand,approved_reductions,approved_surplus_routing,unassigned_surplus,snapshot,status)
      values(${finalizationId},${userId},${cycleId},${planId},${oldVersionId},${review.expectedIncome},${review.originalDemand},'0.00',${review.totalRouting},${review.unassignedSurplus},${snapshot}::jsonb,'APPROVED')
      returning id
    ), audit as (
      insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason)
      select gen_random_uuid(),${userId},'CYCLE_PLAN_FINALIZATION',id,'DRAFT','APPROVED','APPROVE_FINAL_CYCLE_PLAN','اعتماد المراجعة النهائية دون تغيير مبالغ البنود' from finalization
      returning id
    ) select (select count(*) from finalization)::int as finalized`;
    return Number(rows[0]?.finalized)===1?{success:true as const}:{success:false as const,message:'تعذر اعتماد الخطة النهائية'};
  }

  const currentRows=await rawSql`
    select ba.category_id as "categoryId",ba.planned_amount::text as amount,ba.allocation_type as "allocationType"
    from public.budget_allocations ba
    where ba.user_id=${userId} and ba.plan_version_id=${oldVersionId}`;
  if(currentRows.length===0) return {success:false as const,message:'تعذر قراءة بنود الخطة الحالية'};
  const nextRows=await rawSql`select coalesce(max(version_number),0)::int+1 as n from public.plan_versions where user_id=${userId} and plan_id=${planId}`;
  const nextVersion=Number(nextRows[0]?.n??0);
  const newVersionId=randomUUID();
  const finalizationId=randomUUID();
  const statements:SqlQuery[]=[];

  statements.push(rawSql`update public.cycle_plan_finalizations set status='SUPERSEDED' where user_id=${userId} and cycle_id=${cycleId} and status='APPROVED' returning id`);
  statements.push(rawSql`insert into public.plan_versions(id,user_id,plan_id,version_number,revision_reason,is_current,approved_at)
    select ${newVersionId},${userId},id,${nextVersion},'اعتماد نهائي لتعديلات معالجة العجز وتوجيه الفائض',false,now()
    from public.financial_plans where id=${planId} and user_id=${userId} and status='ACTIVE_PLAN' and current_version_id=${oldVersionId}
    returning id`);
  for(const row of currentRows){
    const categoryId=String(row.categoryId);
    const before=Money.parse(String(row.amount??'0')).max(Money.zero());
    const after=before.subtract(reductionMap.get(categoryId)??Money.zero()).max(Money.zero());
    statements.push(rawSql`insert into public.budget_allocations(id,user_id,plan_version_id,category_id,planned_amount,allocation_type)
      select ${randomUUID()},${userId},${newVersionId},${categoryId},${after.toString()},${String(row.allocationType)}
      where exists(select 1 from public.plan_versions where id=${newVersionId} and user_id=${userId}) returning id`);
  }
  statements.push(rawSql`update public.plan_versions set is_current=false where id=${oldVersionId} and user_id=${userId} and is_current=true returning id`);
  statements.push(rawSql`update public.plan_versions set is_current=true where id=${newVersionId} and user_id=${userId} and approved_at is not null returning id`);
  statements.push(rawSql`update public.financial_plans set current_version_id=${newVersionId},status='ACTIVE_PLAN',updated_at=now() where id=${planId} and user_id=${userId} and current_version_id=${oldVersionId} returning id`);
  statements.push(rawSql`insert into public.saving_allocations(id,user_id,cycle_id,plan_version_id,planned_amount,allocated_amount,status)
    select ${randomUUID()},${userId},${cycleId},${newVersionId},coalesce(sum(planned_amount) filter(where allocation_type='SAVING'),0),coalesce(sum(planned_amount) filter(where allocation_type='SAVING'),0),'ALLOCATED'
    from public.budget_allocations where user_id=${userId} and plan_version_id=${newVersionId} returning id`);
  statements.push(rawSql`update public.cycle_budget_optimization_adjustments set status='APPLIED',updated_at=now() where user_id=${userId} and cycle_id=${cycleId} and status='DRAFT' returning id`);
  statements.push(rawSql`update public.cycle_surplus_routing_drafts set status='APPLIED',updated_at=now() where user_id=${userId} and cycle_id=${cycleId} and status='DRAFT' returning id`);
  statements.push(rawSql`insert into public.cycle_plan_finalizations(id,user_id,cycle_id,plan_id,plan_version_id,expected_income,original_demand,approved_reductions,approved_surplus_routing,unassigned_surplus,snapshot,status)
    values(${finalizationId},${userId},${cycleId},${planId},${newVersionId},${review.expectedIncome},${review.originalDemand},${review.approvedReductions},${review.totalRouting},${review.unassignedSurplus},${snapshot}::jsonb,'APPROVED') returning id`);
  statements.push(rawSql`insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason)
    values(${randomUUID()},${userId},'FINANCIAL_PLAN',${planId},'ACTIVE_PLAN','ACTIVE_PLAN','APPROVE_FINAL_CYCLE_PLAN','اعتماد تعديلات معالجة العجز ضمن نسخة خطة جديدة') returning id`);
  statements.push(rawSql`insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason)
    values(${randomUUID()},${userId},'CYCLE_PLAN_FINALIZATION',${finalizationId},'DRAFT','APPROVED','APPROVE_FINAL_CYCLE_PLAN','اعتماد المراجعة النهائية للخطة') returning id`);

  try{
    const result=await rawSql.transaction(statements);
    const versionInsert=result[1]??[];
    if(versionInsert.length!==1) return {success:false as const,message:'تغيرت الخطة أثناء الاعتماد؛ أعد فتح المراجعة ثم حاول مرة أخرى'};
    return {success:true as const};
  }catch{
    return {success:false as const,message:'تعذر اعتماد الخطة النهائية. لم يتم اعتماد التعديلات.'};
  }
}
