'use server';
import { redirect } from 'next/navigation'; import { revalidatePath } from 'next/cache'; import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user'; import { createPlanDraft } from '@/features/financial-plan/commands/create-plan-draft'; import { approvePlan } from '@/features/financial-plan/commands/approve-plan'; import { revisePlan } from '@/features/financial-plan/commands/revise-plan'; import { approveRevision } from '@/features/financial-plan/commands/approve-revision'; import { rawSql } from '@/infrastructure/db/client'; import { reviewInitialBudgetDraft } from '@/features/financial-plan/services/review-initial-budget-draft';
function normalizePriorityLabel(value:string){
  return value
    .trim()
    .toLocaleLowerCase('ar')
    .replace(/[أإآ]/g,'ا')
    .replace(/ى/g,'ي')
    .replace(/ة/g,'ه')
    .replace(/[^\p{L}\p{N}\s]/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function allocations(fd:FormData){const categoryIds=fd.getAll('categoryId').map(String),amounts=fd.getAll('plannedAmount').map(String),types=fd.getAll('allocationType').map(String);return categoryIds.map((categoryId,i)=>({categoryId,plannedAmount:amounts[i]??'0',allocationType:types[i]}));}
export async function createPlanAction(fd:FormData){const u=await requireAuthenticatedMutationUser();const r=await createPlanDraft(u.id,{cycleId:String(fd.get('cycleId')),allocations:allocations(fd)});if(!r.success)redirect(`/budget/new?error=${encodeURIComponent(r.message)}`);revalidatePath('/budget');redirect(`/budget?plan=${r.planId}`)}
export async function updateInitialDraftAction(planId:string,fd:FormData){
  const u=await requireAuthenticatedMutationUser();
  const ids=fd.getAll('allocationId').map(String);
  const amounts=fd.getAll('plannedAmount').map(String);
  const types=fd.getAll('allocationType').map(String);
  const priorities=fd.getAll('itemPriority').map(String);
  const allowed=new Set(['OBLIGATION','ESSENTIAL','SAVING','EMERGENCY','GOAL','FLEXIBLE']);
  const allowedPriorities=new Set(['NECESSARY','IMPORTANT','OPTIONAL','ENTERTAINMENT','']);
  if(!ids.length||ids.length!==amounts.length||ids.length!==types.length||ids.length!==priorities.length){
    redirect('/budget?error='+encodeURIComponent('بيانات المسودة غير مكتملة'));
  }

  const statements=[] as ReturnType<typeof rawSql>[];
  for(let i=0;i<ids.length;i++){
    const amount=Number(amounts[i]);
    const type=types[i]??'';
    const priority=priorities[i]??'';
    if(!Number.isFinite(amount)||amount<0||!allowed.has(type)||!allowedPriorities.has(priority)){
      redirect('/budget?error='+encodeURIComponent('راجع مبالغ وتصنيفات المسودة'));
    }
    statements.push(rawSql`
      with allocation_update as (
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
        returning ba.id,ba.category_id
      ), category_update as (
        update public.budget_categories bc
        set expense_nature_default=nullif(${priority},''),updated_at=now()
        where bc.user_id=${u.id}::uuid and bc.id in (select category_id from allocation_update)
        returning bc.id
      )
      select id from allocation_update
    `);
  }

  const results=await rawSql.transaction(statements);
  if(results.some(result=>result.length!==1)){
    redirect('/budget?error='+encodeURIComponent('تعذر تحديث أحد بنود المسودة'));
  }

  const learningTable=await rawSql`select to_regclass('public.budget_priority_preferences')::text table_name`;
  if((learningTable[0] as Record<string,unknown>|undefined)?.table_name){
    for(let i=0;i<ids.length;i++){
      const priority=priorities[i]??'';
      if(!priority) continue;
      const row=await rawSql`
        select bc.name,ba.allocation_type
        from public.budget_allocations ba
        join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=ba.user_id
        join public.plan_versions pv on pv.id=ba.plan_version_id and pv.user_id=ba.user_id
        join public.financial_plans p on p.id=pv.plan_id and p.user_id=pv.user_id
        where ba.id=${ids[i]}::uuid and ba.user_id=${u.id}::uuid
          and p.id=${planId}::uuid and p.status='PLAN_DRAFT'
        limit 1
      `;
      const source=row[0] as Record<string,unknown>|undefined;
      if(!source) continue;
      const normalizedLabel=normalizePriorityLabel(String(source.name??''));
      const allocationType=String(source.allocation_type??'');
      if(!normalizedLabel||!allocationType) continue;
      await rawSql`
        insert into public.budget_priority_preferences(
          user_id,normalized_label,allocation_type,chosen_priority,confirmation_count,last_confirmed_at
        ) values(
          ${u.id}::uuid,${normalizedLabel},${allocationType},${priority},1,now()
        )
        on conflict(user_id,normalized_label,allocation_type)
        do update set
          chosen_priority=excluded.chosen_priority,
          confirmation_count=public.budget_priority_preferences.confirmation_count+1,
          last_confirmed_at=now(),
          updated_at=now()
      `;
    }
  }

  revalidatePath('/budget');
  redirect('/budget?draft=updated');
}

/*__LEARNING_INSERT_END__*/
  }

  const results=await rawSql.transaction(statements);
  if(results.some(result=>result.length!==1)){
    redirect('/budget?error='+encodeURIComponent('تعذر تحديث أحد بنود المسودة'));
  }
  revalidatePath('/budget');
  redirect('/budget?draft=updated');
}

export async function applyInitialBudgetCorrectionsAction(planId:string){
  const u=await requireAuthenticatedMutationUser();
  const review=await reviewInitialBudgetDraft(u.id,planId);
  if(!review.correctionSuggestions.length){
    redirect('/budget?error='+encodeURIComponent('لا توجد اقتراحات تصحيح قابلة للتطبيق على هذه المسودة.'));
  }

  const statements=[] as ReturnType<typeof rawSql>[];
  for(const suggestion of review.correctionSuggestions){
    statements.push(rawSql`
      update public.budget_allocations ba
      set planned_amount=${suggestion.suggestedAmount},updated_at=now()
      where ba.id=${suggestion.allocationId}::uuid and ba.user_id=${u.id}::uuid
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
    redirect('/budget?error='+encodeURIComponent('تعذر تطبيق أحد اقتراحات التصحيح.'));
  }

  revalidatePath('/budget');
  redirect('/budget?draft=corrected');
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
