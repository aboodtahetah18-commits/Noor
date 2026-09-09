import { rawSql } from '@/infrastructure/db/client';
import { Money, sumMoney } from '@/financial-engine/money';
import { getSalaryAllocationOptimizer } from '@/features/budget-optimizer/queries/get-salary-allocation-optimizer';
import { getSurplusRouting } from '@/features/surplus-routing/queries/get-surplus-routing';

export type FinalPlanCategoryChange={
  categoryId:string;
  label:string;
  priorityClass:string;
  before:string;
  reduction:string;
  after:string;
};
const money=(value:unknown)=>Money.parse(String(value??'0'));

export async function getFinalPlanReview(userId:string){
  const [optimizer,routing]=await Promise.all([
    getSalaryAllocationOptimizer(userId),
    getSurplusRouting(userId),
  ]);
  if(!optimizer) return null;
  const cycleId=String(optimizer.cycle.id);
  const [planRows,finalizationRows]=await Promise.all([rawSql`
    select p.id,p.status,p.current_version_id as "currentVersionId",pv.version_number as "versionNumber"
    from public.financial_plans p
    join public.plan_versions pv on pv.id=p.current_version_id and pv.user_id=p.user_id
    where p.user_id=${userId} and p.cycle_id=${cycleId} and p.status='ACTIVE_PLAN'
    limit 1`,rawSql`
    select snapshot,status,approved_at::text as "approvedAt"
    from public.cycle_plan_finalizations
    where user_id=${userId} and cycle_id=${cycleId} and status='APPROVED'
    order by approved_at desc limit 1`]);
  const plan=planRows[0];
  const categoryChanges:FinalPlanCategoryChange[]=optimizer.items
    .filter(i=>i.kind==='CATEGORY'&&i.categoryId)
    .map(i=>({
      categoryId:String(i.categoryId),
      label:i.label,
      priorityClass:i.priorityClass,
      before:i.amount,
      reduction:i.currentReduction,
      after:money(i.amount).subtract(money(i.currentReduction)).max(Money.zero()).toString(),
    }));
  const reductions=categoryChanges.filter(c=>money(c.reduction).isPositive());
  const routingRows=(routing?.destinations??[]).filter(d=>money(d.currentDraft).isPositive()).map(d=>({
    key:d.key,
    kind:d.kind,
    label:d.label,
    amount:d.currentDraft,
    reason:d.reason,
  }));
  const totalRouting=sumMoney(routingRows.map(r=>money(r.amount)));
  const available=money(routing?.availableSurplus??optimizer.surplus);
  const unassigned=available.subtract(totalRouting).max(Money.zero());
  const blockers:string[]=[];
  if(!plan) blockers.push('لا توجد خطة نشطة قابلة للاعتماد النهائي.');
  if(money(optimizer.deficit).isPositive()) blockers.push(`ما زال هناك عجز قدره ${optimizer.deficit} ريال.`);
  if(money(routing?.overAssigned??'0').isPositive()) blockers.push('توزيع الفائض يتجاوز الفائض المتاح.');
  const latest=finalizationRows[0];
  return {
    cycle:optimizer.cycle,
    plan:plan?{id:String(plan.id),status:String(plan.status),currentVersionId:String(plan.currentVersionId),versionNumber:Number(plan.versionNumber)}:null,
    expectedIncome:optimizer.expectedIncome,
    originalDemand:optimizer.originalDemand,
    approvedReductions:optimizer.draftReductions,
    adjustedDemand:optimizer.adjustedDemand,
    deficit:optimizer.deficit,
    surplus:optimizer.surplus,
    recoveryDemand:optimizer.recoveryDemand,
    recoveryPrincipal:optimizer.recoveryPrincipal,
    recoveryGrowth:optimizer.recoveryGrowth,
    recoveryReservations:optimizer.recoveryReservations,
    categoryChanges,
    reductions,
    routingRows,
    totalRouting:totalRouting.toString(),
    unassignedSurplus:unassigned.toString(),
    blockers,
    canApprove:blockers.length===0,
    latestApprovedFinalization:latest?{snapshot:latest.snapshot,approvedAt:String(latest.approvedAt)}:null,
  };
}
