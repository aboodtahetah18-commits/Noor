'use server';
import { redirect } from 'next/navigation'; import { revalidatePath } from 'next/cache'; import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user'; import { createPlanDraft } from '@/features/financial-plan/commands/create-plan-draft'; import { approvePlan } from '@/features/financial-plan/commands/approve-plan'; import { revisePlan } from '@/features/financial-plan/commands/revise-plan'; import { approveRevision } from '@/features/financial-plan/commands/approve-revision'; import { rawSql } from '@/infrastructure/db/client'; import { reviewInitialBudgetDraft } from '@/features/financial-plan/services/review-initial-budget-draft';
function clamp01(value:number){
  return Math.max(0,Math.min(1,value));
}

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
  const priorityScopes=fd.getAll('itemPriorityScope').map(String);
  const priorityReasons=fd.getAll('itemPriorityReason').map(String);
  const priorityNotes=fd.getAll('itemPriorityNote').map(String);
  const temporaryExtraAmounts=fd.getAll('temporaryExtraAmount').map(String);
  const allowed=new Set(['OBLIGATION','ESSENTIAL','SAVING','EMERGENCY','GOAL','FLEXIBLE']);
  const allowedPriorities=new Set(['NECESSARY','IMPORTANT','OPTIONAL','ENTERTAINMENT','']);
  const allowedPriorityScopes=new Set(['AUTO','THIS_CYCLE','PERSISTENT']);
  const allowedPriorityReasons=new Set(['TRAVEL','OCCASION','HEALTH','MAINTENANCE','UNUSUAL_MONTH','OTHER','']);
  if(!ids.length||ids.length!==amounts.length||ids.length!==types.length||ids.length!==priorities.length||ids.length!==priorityScopes.length||ids.length!==priorityReasons.length||ids.length!==priorityNotes.length||ids.length!==temporaryExtraAmounts.length){
    redirect('/budget?error='+encodeURIComponent('بيانات المسودة غير مكتملة'));
  }

  const statements=[] as ReturnType<typeof rawSql>[];
  for(let i=0;i<ids.length;i++){
    const amount=Number(amounts[i]);
    const type=types[i]??'';
    const priority=priorities[i]??'';
    const priorityScope=priorityScopes[i]??'AUTO';
    const priorityReason=priorityReasons[i]??'';
    const priorityNote=(priorityNotes[i]??'').trim();
    const temporaryExtraRaw=temporaryExtraAmounts[i]??'';
    const temporaryExtraAmount=temporaryExtraRaw===''?null:Number(temporaryExtraRaw);
    if(!Number.isFinite(amount)||amount<0||!allowed.has(type)||!allowedPriorities.has(priority)||!allowedPriorityScopes.has(priorityScope)||!allowedPriorityReasons.has(priorityReason)||priorityNote.length>240||(temporaryExtraAmount!==null&&(!Number.isFinite(temporaryExtraAmount)||temporaryExtraAmount<=0))){
      redirect('/budget?error='+encodeURIComponent('راجع مبالغ وتصنيفات وأسباب المسودة'));
    }
    if(priorityScope==='THIS_CYCLE'&&(priority||temporaryExtraAmount!==null)&&!priorityReason){
      redirect('/budget?error='+encodeURIComponent('حدد سبب التغيير المؤقت لهذا البند'));
    }
    if(temporaryExtraAmount!==null&&priorityScope!=='THIS_CYCLE'){
      redirect('/budget?error='+encodeURIComponent('الزيادة الظرفية يجب أن تكون لهذه الميزانية فقط'));
    }
    statements.push(rawSql`
      with allocation_update as (
        update public.budget_allocations ba
        set planned_amount=${amount},
            allocation_type=${type},
            priority_override=case when ${priorityScope}='AUTO' then null else nullif(${priority},'') end,
            priority_override_scope=case
              when ${priorityScope}='THIS_CYCLE' and (nullif(${priority},'') is not null or ${temporaryExtraAmount} is not null or nullif(${priorityReason},'') is not null) then 'THIS_CYCLE'
              when ${priorityScope}='PERSISTENT' and nullif(${priority},'') is not null then 'PERSISTENT'
              else null
            end,
            priority_override_reason=case when ${priorityScope}='THIS_CYCLE' then nullif(${priorityReason},'') else null end,
            priority_override_note=case when ${priorityScope}='THIS_CYCLE' then nullif(${priorityNote},'') else null end,
            temporary_extra_amount=case when ${priorityScope}='THIS_CYCLE' then ${temporaryExtraAmount} else null end,
            updated_at=now()
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
        set expense_nature_default=case when ${priorityScope}='PERSISTENT' then nullif(${priority},'') else bc.expense_nature_default end,
            updated_at=case when ${priorityScope}='PERSISTENT' then now() else bc.updated_at end
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
      const priorityScope=priorityScopes[i]??'AUTO';
      if(!priority||priorityScope!=='PERSISTENT') continue;
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
          user_id,normalized_label,allocation_type,chosen_priority,confirmation_count,correction_count,last_confirmed_at,last_corrected_at
        ) values(
          ${u.id}::uuid,${normalizedLabel},${allocationType},${priority},1,0,now(),null
        )
        on conflict(user_id,normalized_label,allocation_type)
        do update set
          correction_count=public.budget_priority_preferences.correction_count
            + case when public.budget_priority_preferences.chosen_priority<>excluded.chosen_priority then 1 else 0 end,
          chosen_priority=excluded.chosen_priority,
          confirmation_count=public.budget_priority_preferences.confirmation_count+1,
          last_confirmed_at=now(),
          last_corrected_at=case
            when public.budget_priority_preferences.chosen_priority<>excluded.chosen_priority then now()
            else public.budget_priority_preferences.last_corrected_at
          end,
          updated_at=now()
      `;
    }
  }

  revalidatePath('/budget');
  redirect('/budget?draft=updated');
}


export async function applyTemporaryExtraSuggestionAction(planId:string,allocationId:string){
  const u=await requireAuthenticatedMutationUser();
  const review=await reviewInitialBudgetDraft(u.id,planId);
  const suggestion=review.temporaryExtraSuggestions.find(item=>item.allocationId===allocationId);
  if(!suggestion){
    redirect('/budget?error='+encodeURIComponent('لا يوجد تقدير تاريخي صالح لهذا البند حاليًا.'));
  }
  if(suggestion.requiresManualAmount){
    redirect('/budget?error='+encodeURIComponent('هذا التقدير يحتاج اختيار مبلغ نهائي من النطاق المقترح قبل التطبيق.'));
  }

  const rows=await rawSql`
    update public.budget_allocations ba
    set temporary_extra_amount=${suggestion.suggestedExtraAmount},
        priority_override_scope='THIS_CYCLE',
        updated_at=now()
    where ba.id=${allocationId}::uuid and ba.user_id=${u.id}::uuid
      and priority_override_reason is not null
      and exists(
        select 1
        from public.plan_versions pv
        join public.financial_plans p on p.id=pv.plan_id and p.user_id=pv.user_id
        where pv.id=ba.plan_version_id and pv.user_id=${u.id}::uuid
          and p.id=${planId}::uuid and p.status='PLAN_DRAFT'
          and pv.version_number=1 and pv.approved_at is null
      )
    returning ba.id
  `;
  if(rows.length!==1){
    redirect('/budget?error='+encodeURIComponent('احفظ سبب الظرف المؤقت أولًا ثم أعد المحاولة.'));
  }

  revalidatePath('/budget');
  redirect('/budget?draft=context-estimated');
}

export async function confirmTemporaryExtraAmountAction(planId:string,allocationId:string,fd:FormData){
  const u=await requireAuthenticatedMutationUser();
  const review=await reviewInitialBudgetDraft(u.id,planId);
  const suggestion=review.temporaryExtraSuggestions.find(item=>item.allocationId===allocationId);
  if(!suggestion){
    redirect('/budget?error='+encodeURIComponent('لم يعد نطاق التقدير متاحًا. أعد حفظ الظرف المؤقت ثم حاول مرة أخرى.'));
  }

  const amount=Number(String(fd.get('confirmedTemporaryExtraAmount')??''));
  if(!Number.isFinite(amount)||amount<=0){
    redirect('/budget?error='+encodeURIComponent('أدخل مبلغًا نهائيًا صالحًا للزيادة المؤقتة.'));
  }
  if(amount<suggestion.suggestedMinimum||amount>suggestion.suggestedMaximum){
    redirect('/budget?error='+encodeURIComponent('المبلغ المختار خارج النطاق التاريخي المقترح. عدّل المبلغ أو أدخله يدويًا من بيانات البند.'));
  }

  const rows=await rawSql`
    update public.budget_allocations ba
    set temporary_extra_amount=${amount},
        priority_override_scope='THIS_CYCLE',
        updated_at=now()
    where ba.id=${allocationId}::uuid and ba.user_id=${u.id}::uuid
      and priority_override_reason is not null
      and exists(
        select 1
        from public.plan_versions pv
        join public.financial_plans p on p.id=pv.plan_id and p.user_id=pv.user_id
        where pv.id=ba.plan_version_id and pv.user_id=${u.id}::uuid
          and p.id=${planId}::uuid and p.status='PLAN_DRAFT'
          and pv.version_number=1 and pv.approved_at is null
      )
    returning ba.id,ba.category_id,ba.priority_override_reason
  `;
  if(rows.length!==1){
    redirect('/budget?error='+encodeURIComponent('تعذر حفظ المبلغ النهائي للظرف المؤقت.'));
  }

  const learningTable=await rawSql`select to_regclass('public.budget_temporary_amount_preferences')::text table_name`;
  if((learningTable[0] as Record<string,unknown>|undefined)?.table_name){
    const source=await rawSql`
      select bc.name,ba.priority_override_reason
      from public.budget_allocations ba
      join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=ba.user_id
      where ba.id=${allocationId}::uuid and ba.user_id=${u.id}::uuid
      limit 1
    `;
    const sourceRow=source[0] as Record<string,unknown>|undefined;
    const normalizedLabel=normalizePriorityLabel(String(sourceRow?.name??''));
    const contextReason=String(sourceRow?.priority_override_reason??'');
    const range=suggestion.suggestedMaximum-suggestion.suggestedMinimum;
    const position=range>0
      ? clamp01((amount-suggestion.suggestedMinimum)/range)
      : 0.5;

    if(normalizedLabel&&['TRAVEL','OCCASION','HEALTH','MAINTENANCE','UNUSUAL_MONTH','OTHER'].includes(contextReason)){
      await rawSql`
        insert into public.budget_temporary_amount_preferences(
          user_id,normalized_label,context_reason,confirmation_count,average_position,last_confirmed_amount,last_confirmed_at
        ) values(
          ${u.id}::uuid,${normalizedLabel},${contextReason},1,${position},${amount},now()
        )
        on conflict(user_id,normalized_label,context_reason)
        do update set
          average_position=(
            public.budget_temporary_amount_preferences.average_position
              * public.budget_temporary_amount_preferences.confirmation_count
            + excluded.average_position
          )/(public.budget_temporary_amount_preferences.confirmation_count+1),
          confirmation_count=public.budget_temporary_amount_preferences.confirmation_count+1,
          last_confirmed_amount=excluded.last_confirmed_amount,
          last_confirmed_at=now(),
          updated_at=now()
      `;
    }
  }

  revalidatePath('/budget');
  redirect('/budget?draft=context-estimated');
}

export async function applyTemporaryBudgetFundingAction(planId:string,targetAllocationId:string){
  const u=await requireAuthenticatedMutationUser();
  const review=await reviewInitialBudgetDraft(u.id,planId);
  const fundingPlan=review.temporaryFundingPlans.find(plan=>plan.targetAllocationId===targetAllocationId);
  if(!fundingPlan){
    redirect('/budget?error='+encodeURIComponent('لم تعد خطة التغطية المؤقتة متاحة. احفظ المسودة وأعد المراجعة.'));
  }
  if(fundingPlan.unresolvedAmount>0){
    redirect('/budget?error='+encodeURIComponent('لا يمكن تطبيق الزيادة المؤقتة قبل تغطية كامل المبلغ دون المساس بالالتزامات الأساسية.'));
  }

  const statements=[] as ReturnType<typeof rawSql>[];
  statements.push(rawSql`
    update public.budget_allocations ba
    set planned_amount=planned_amount+${fundingPlan.extraAmount},
        temporary_extra_amount=null,
        updated_at=now()
    where ba.id=${targetAllocationId}::uuid and ba.user_id=${u.id}::uuid
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

  for(const source of fundingPlan.sourceReductions){
    statements.push(rawSql`
      update public.budget_allocations ba
      set planned_amount=${source.suggestedAmount},updated_at=now()
      where ba.id=${source.allocationId}::uuid and ba.user_id=${u.id}::uuid
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
    redirect('/budget?error='+encodeURIComponent('تعذر تطبيق خطة التغطية المؤقتة بالكامل.'));
  }

  revalidatePath('/budget');
  redirect('/budget?draft=context-funded');
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
