'use server';
import { redirect } from 'next/navigation'; import { revalidatePath } from 'next/cache'; import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user'; import { createPlanDraft } from '@/features/financial-plan/commands/create-plan-draft'; import { approvePlan } from '@/features/financial-plan/commands/approve-plan'; import { revisePlan } from '@/features/financial-plan/commands/revise-plan'; import { approveRevision } from '@/features/financial-plan/commands/approve-revision'; import { rawSql } from '@/infrastructure/db/client'; import { reviewInitialBudgetDraft } from '@/features/financial-plan/services/review-initial-budget-draft';
function allocations(fd:FormData){const categoryIds=fd.getAll('categoryId').map(String),amounts=fd.getAll('plannedAmount').map(String),types=fd.getAll('allocationType').map(String);return categoryIds.map((categoryId,i)=>({categoryId,plannedAmount:amounts[i]??'0',allocationType:types[i]}));}
export async function createPlanAction(fd:FormData){const u=await requireAuthenticatedMutationUser();const r=await createPlanDraft(u.id,{cycleId:String(fd.get('cycleId')),allocations:allocations(fd)});if(!r.success)redirect(`/budget/new?error=${encodeURIComponent(r.message)}`);revalidatePath('/budget');redirect(`/budget?plan=${r.planId}`)}
export async function updateInitialDraftAction(planId:string,fd:FormData){
  const u=await requireAuthenticatedMutationUser();
  const ids=fd.getAll('allocationId').map(String);
  const amounts=fd.getAll('plannedAmount').map(String);
  const types=fd.getAll('allocationType').map(String);
  const allowed=new Set(['OBLIGATION','ESSENTIAL','SAVING','EMERGENCY','GOAL','FLEXIBLE']);
  if(!ids.length||ids.length!==amounts.length||ids.length!==types.length){
    redirect('/budget?error='+encodeURIComponent('بيانات المسودة غير مكتملة'));
  }

  const statements=[] as ReturnType<typeof rawSql>[];
  for(let i=0;i<ids.length;i++){
    const amount=Number(amounts[i]);
    const type=types[i]??'';
    if(!Number.isFinite(amount)||amount<0||!allowed.has(type)){
      redirect('/budget?error='+encodeURIComponent('راجع مبالغ وتصنيفات المسودة'));
    }
    statements.push(rawSql`
      update public.budget_allocations ba
      set planned_amount=${amount},allocation_type=${type},updated_at=now()
      where ba.id=${ids[i]}::uuid and ba.user_id=${u.id}::uuid
        and exists(
          select 1
          from public.plan_versions pv
          join public.financial_plans p on p.id=pv.plan_id and p.user_id=pv.user_id
          where pv.id=ba.plan_version_id and pv.user_id=${u.id}::uuid
            and p.id=${planId}::uuid and p.status='PLAN_DRAFT'
            and pv.version_number=1 and pv.approved_at is null
        )
      returning ba.id
    `);
  }

  const results=await rawSql.transaction(statements);
  if(results.some(result=>result.length!==1)){
    redirect('/budget?error='+encodeURIComponent('تعذر تحديث أحد بنود المسودة'));
  }
  revalidatePath('/budget');
  redirect('/budget?draft=updated');
}

export async function approvePlanAction(planId:string){
  const u=await requireAuthenticatedMutationUser();
  const review=await reviewInitialBudgetDraft(u.id,planId);
  if(!review.canApprove){
    const blocker=review.issues.find(issue=>issue.severity==='blocker');
    redirect('/budget?error='+encodeURIComponent(blocker?.message??'تعذر اعتماد الميزانية قبل معالجة ملاحظات المراجعة.'));
  }
  const result=await approvePlan(u.id,planId);
  if(!result.success){
    redirect('/budget?error='+encodeURIComponent('تعذر اعتماد الميزانية الآن. راجع المسودة ثم حاول مرة أخرى.'));
  }
  revalidatePath('/budget');
  redirect(`/budget?plan=${planId}`);
}
export async function revisePlanAction(planId:string,fd:FormData){const u=await requireAuthenticatedMutationUser();const categoryIds=fd.getAll('categoryId').map(String),amounts=fd.getAll('newAmount').map(String);const r=await revisePlan(u.id,{planId,revisionReason:String(fd.get('revisionReason')??''),changes:categoryIds.map((categoryId,i)=>({categoryId,newAmount:amounts[i]??'0'}))});if(!r.success)redirect(`/budget/revise?plan=${planId}&error=${encodeURIComponent(r.message)}`);revalidatePath('/budget');redirect(`/budget?plan=${planId}`)}
export async function approveRevisionAction(planId:string){const u=await requireAuthenticatedMutationUser();await approveRevision(u.id,planId);const {syncApprovedPressureDecisionPackagesForUser}=await import('@/features/future-pressure/commands/manage-pressure-decision-packages');await syncApprovedPressureDecisionPackagesForUser(u.id);revalidatePath('/budget');redirect(`/budget?plan=${planId}`)}
