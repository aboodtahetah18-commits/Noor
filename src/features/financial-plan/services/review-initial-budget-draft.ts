import { rawSql } from '@/infrastructure/db/client';
import { getBudgetPriorityConfidence } from '@/features/budget/services/budget-priority-confidence';

export type InitialBudgetReviewIssue={
  code:
    | 'NO_ITEMS'
    | 'INCOME_MISSING'
    | 'CORE_OVER_INCOME'
    | 'ZERO_OR_MISSING_AMOUNT'
    | 'TOTAL_OVER_INCOME'
    | 'NO_EMERGENCY_OR_SAVING'
    | 'PRIORITY_CONFIRMATION_REQUIRED';
  severity:'blocker'|'warning';
  message:string;
  itemName?:string;
};

export type InitialBudgetCorrectionSuggestion={
  allocationId:string;
  itemName:string;
  allocationType:string;
  currentAmount:number;
  suggestedAmount:number;
  reduction:number;
  reason:string;
  historicalMonthlyAverage:number;
  activeMonths90d:number;
  historySignal:'none'|'light'|'stable';
  userPriority:'NECESSARY'|'IMPORTANT'|'OPTIONAL'|'ENTERTAINMENT'|null;
  temporaryContextReason:'TRAVEL'|'OCCASION'|'HEALTH'|'MAINTENANCE'|'UNUSUAL_MONTH'|'OTHER'|null;
  temporaryContextNote:string|null;
};

export type TemporaryBudgetFundingSource={
  allocationId:string;
  itemName:string;
  allocationType:string;
  currentAmount:number;
  suggestedAmount:number;
  reduction:number;
};

export type TemporaryBudgetFundingPlan={
  targetAllocationId:string;
  targetItemName:string;
  reason:'TRAVEL'|'OCCASION'|'HEALTH'|'MAINTENANCE'|'UNUSUAL_MONTH'|'OTHER';
  extraAmount:number;
  availableFromFreeMargin:number;
  fundedFromFreeMargin:number;
  sourceReductions:TemporaryBudgetFundingSource[];
  fundedTotal:number;
  unresolvedAmount:number;
};

export type InitialBudgetReview={
  canApprove:boolean;
  income:number;
  coreTotal:number;
  total:number;
  remainingAfterCore:number;
  remainingAfterPlan:number;
  itemCount:number;
  issues:InitialBudgetReviewIssue[];
  correctionSuggestions:InitialBudgetCorrectionSuggestion[];
  suggestedReductionTotal:number;
  unresolvedGap:number;
  temporaryFundingPlans:TemporaryBudgetFundingPlan[];
};

function finite(value:unknown){
  const number=Number(value);
  return Number.isFinite(number)?number:0;
}

export async function reviewInitialBudgetDraft(userId:string,planId:string):Promise<InitialBudgetReview>{
  const planRows=await rawSql`
    select p.id,p.cycle_id,p.status
    from public.financial_plans p
    where p.id=${planId}::uuid and p.user_id=${userId}::uuid
    limit 1
  `;
  const plan=planRows[0] as Record<string,unknown>|undefined;
  if(!plan||String(plan.status)!=='PLAN_DRAFT'){
    return {
      canApprove:false,
      income:0,
      coreTotal:0,
      total:0,
      remainingAfterCore:0,
      remainingAfterPlan:0,
      itemCount:0,
      issues:[{code:'NO_ITEMS',severity:'blocker',message:'المسودة غير متاحة للمراجعة قبل الاعتماد.'}],
      correctionSuggestions:[],
      suggestedReductionTotal:0,
      unresolvedGap:0,
      temporaryFundingPlans:[],
    };
  }

  const cycleId=String(plan.cycle_id);
  const [allocationRows,incomeRows,foundationRows]=await Promise.all([
    rawSql`
      select ba.id,ba.category_id,bc.name,bc.expense_nature_default,ba.priority_override,ba.priority_override_scope,ba.priority_override_reason,ba.priority_override_note,ba.temporary_extra_amount::text,ba.planned_amount::text,ba.allocation_type,
        r.recurrence_kind,r.interval_cycles
      from public.plan_versions pv
      join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.user_id=pv.user_id
      join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=ba.user_id
      left join public.plan_item_rules r on r.user_id=ba.user_id and r.category_id=ba.category_id and r.is_active=true
      where pv.user_id=${userId}::uuid and pv.plan_id=${planId}::uuid
        and pv.version_number=1 and pv.approved_at is null
      order by bc.name
    `,
    rawSql`
      select coalesce(sum(expected_amount),0)::text total
      from public.expected_incomes
      where user_id=${userId}::uuid and cycle_id=${cycleId}::uuid
    `,
    rawSql`
      select value_json
      from public.user_foundation_facts
      where user_id=${userId}::uuid and fact_key='income' and status='ACTIVE'
      order by updated_at desc
      limit 1
    `,
  ]);

  const expectedIncome=finite((incomeRows[0] as Record<string,unknown>|undefined)?.total);
  const foundationValue=(foundationRows[0] as Record<string,unknown>|undefined)?.value_json;
  const foundationIncome=foundationValue&&typeof foundationValue==='object'&&!Array.isArray(foundationValue)
    ? finite((foundationValue as Record<string,unknown>).actual_net)
    : 0;
  const income=expectedIncome>0?expectedIncome:foundationIncome;

  const categoryIds=allocationRows.map(row=>String(row.category_id)).filter(Boolean);
  const historyRows=categoryIds.length
    ? await rawSql`
        select t.category_id,
          coalesce(sum(case when t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') then t.amount else 0 end),0)::text actual_90d,
          count(distinct date_trunc('month',t.transaction_date))::int active_months_90d,
          count(*)::int transaction_count_90d
        from public.transactions t
        where t.user_id=${userId}::uuid
          and t.category_id=any(${categoryIds}::uuid[])
          and t.status='POSTED'
          and t.transaction_date>=current_date-interval '90 days'
          and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')
        group by t.category_id
      `
    : [];
  const historyByCategory=new Map(historyRows.map(row=>[String(row.category_id),{
    actual90d:finite(row.actual_90d),
    activeMonths90d:Number(row.active_months_90d??0),
    transactionCount90d:Number(row.transaction_count_90d??0),
  }]));

  const items=allocationRows.map(row=>{
    const categoryId=String(row.category_id);
    const history=historyByCategory.get(categoryId)??{actual90d:0,activeMonths90d:0,transactionCount90d:0};
    const observedMonths=Math.max(1,Math.min(3,history.activeMonths90d||3));
    return {
      allocationId:String(row.id),
      categoryId,
      name:String(row.name??'بند'),
      amount:finite(row.planned_amount),
      type:String(row.allocation_type??''),
      recurrenceKind:String(row.recurrence_kind??'MONTHLY'),
      historicalMonthlyAverage:history.actual90d/observedMonths,
      activeMonths90d:history.activeMonths90d,
      transactionCount90d:history.transactionCount90d,
      userPriority:row.priority_override
        ? String(row.priority_override)
        : row.expense_nature_default
          ? String(row.expense_nature_default)
          : null,
      temporaryContextReason:row.priority_override_scope==='THIS_CYCLE'&&row.priority_override_reason
        ? String(row.priority_override_reason)
        : null,
      temporaryContextNote:row.priority_override_scope==='THIS_CYCLE'&&row.priority_override_note
        ? String(row.priority_override_note)
        : null,
      temporaryExtraAmount:row.priority_override_scope==='THIS_CYCLE'
        ? finite(row.temporary_extra_amount)
        : 0,
    };
  });

  const priorityConfidence=await getBudgetPriorityConfidence(userId,items.map(item=>({
    id:item.allocationId,
    name:item.name,
    allocationType:item.type,
  })));

  const total=items.reduce((sum,item)=>sum+item.amount,0);
  const coreItems=items.filter(item=>item.type==='OBLIGATION'||item.type==='ESSENTIAL');
  const coreTotal=coreItems.reduce((sum,item)=>sum+item.amount,0);
  const issues:InitialBudgetReviewIssue[]=[];

  if(!items.length){
    issues.push({code:'NO_ITEMS',severity:'blocker',message:'لا توجد بنود في المسودة. أضف بندًا واحدًا على الأقل قبل الاعتماد.'});
  }

  if(income<=0){
    issues.push({code:'INCOME_MISSING',severity:'blocker',message:'لا يوجد دخل شهري مؤكد يمكن مقارنة الميزانية به. أكمل بيانات الدخل أولًا.'});
  }

  for(const item of items){
    const confidence=priorityConfidence.get(item.allocationId);
    if(confidence?.requiresManualConfirmation&&!item.userPriority){
      issues.push({
        code:'PRIORITY_CONFIRMATION_REQUIRED',
        severity:'blocker',
        message:`بند «${item.name}» تغيّرت أولويته عدة مرات سابقًا. اختر أولوية هذا البند يدويًا واحفظ المسودة قبل الاعتماد.`,
        itemName:item.name,
      });
    }
    if(item.amount<=0){
      const core=item.type==='OBLIGATION'||item.type==='ESSENTIAL';
      issues.push({
        code:'ZERO_OR_MISSING_AMOUNT',
        severity:core?'blocker':'warning',
        message:core
          ? `بند «${item.name}» أساسي أو التزام ولا يحتوي على مبلغ صالح أكبر من صفر.`
          : `بند «${item.name}» قيمته صفر. أبقه بهذه القيمة فقط إذا كنت تريد تعطيله مؤقتًا.`,
        itemName:item.name,
      });
    }
  }

  if(income>0&&coreTotal>income){
    const gap=coreTotal-income;
    issues.push({
      code:'CORE_OVER_INCOME',
      severity:'blocker',
      message:`الالتزامات والاحتياجات الأساسية تتجاوز الدخل الشهري بمقدار ${gap.toFixed(2)} ريال.`,
    });
  }

  if(income>0&&total>income&&coreTotal<=income){
    issues.push({
      code:'TOTAL_OVER_INCOME',
      severity:'blocker',
      message:`إجمالي المسودة أعلى من الدخل الشهري بمقدار ${(total-income).toFixed(2)} ريال. خفّض البنود غير الأساسية قبل الاعتماد.`,
    });
  }

  const temporaryFundingPlans:TemporaryBudgetFundingPlan[]=[];
  const freeMargin=income>0?Math.max(0,income-total):0;
  for(const target of items.filter(item=>item.temporaryContextReason&&item.temporaryExtraAmount>0)){
    let remaining=target.temporaryExtraAmount;
    const fundedFromFreeMargin=Math.min(freeMargin,remaining);
    remaining-=fundedFromFreeMargin;

    const sourceReductions:TemporaryBudgetFundingSource[]=[];
    const fundingCandidates=items
      .filter(item=>item.allocationId!==target.allocationId&&item.amount>0&&['FLEXIBLE','GOAL','SAVING'].includes(item.type))
      .sort((a,b)=>{
        const rank=(item:typeof items[number])=>{
          if(item.type==='FLEXIBLE'&&item.userPriority==='ENTERTAINMENT') return 0;
          if(item.type==='FLEXIBLE'&&item.userPriority==='OPTIONAL') return 1;
          if(item.type==='FLEXIBLE') return 2;
          if(item.type==='GOAL') return 3;
          return 4;
        };
        return rank(a)-rank(b)||a.amount-b.amount;
      });

    for(const source of fundingCandidates){
      if(remaining<=0) break;
      const usageRatio=source.amount>0?source.historicalMonthlyAverage/source.amount:0;
      const stableHistory=source.type==='FLEXIBLE'&&source.activeMonths90d>=3&&usageRatio>=0.7;
      const lightHistory=source.type==='FLEXIBLE'&&!stableHistory&&(source.activeMonths90d>0||source.transactionCount90d>0);
      const explicitFloor=source.userPriority==='NECESSARY'
        ? source.amount
        : source.userPriority==='IMPORTANT'
          ? source.amount*0.6
          : 0;
      const historyFloor=stableHistory
        ? Math.min(source.amount,source.historicalMonthlyAverage*0.8)
        : lightHistory
          ? Math.min(source.amount,source.historicalMonthlyAverage*0.5)
          : 0;
      const reducible=Math.max(0,source.amount-Math.max(explicitFloor,historyFloor));
      const reduction=Math.min(reducible,remaining);
      if(reduction<=0) continue;
      sourceReductions.push({
        allocationId:source.allocationId,
        itemName:source.name,
        allocationType:source.type,
        currentAmount:source.amount,
        suggestedAmount:Math.max(0,source.amount-reduction),
        reduction,
      });
      remaining-=reduction;
    }

    const fundedTotal=target.temporaryExtraAmount-remaining;
    temporaryFundingPlans.push({
      targetAllocationId:target.allocationId,
      targetItemName:target.name,
      reason:target.temporaryContextReason as TemporaryBudgetFundingPlan['reason'],
      extraAmount:target.temporaryExtraAmount,
      availableFromFreeMargin:freeMargin,
      fundedFromFreeMargin,
      sourceReductions,
      fundedTotal,
      unresolvedAmount:Math.max(0,remaining),
    });
  }

  const correctionSuggestions:InitialBudgetCorrectionSuggestion[]=[];
  let remainingGap=income>0?Math.max(0,total-income):0;
  const correctionPriority=['FLEXIBLE','GOAL','SAVING'];
  for(const type of correctionPriority){
    const candidates=items
      .filter(candidate=>candidate.type===type&&candidate.amount>0)
      .sort((a,b)=>{
        if(type!=='FLEXIBLE') return a.amount-b.amount;
        const priorityRank=(value:string|null)=>{
          if(value==='ENTERTAINMENT') return 0;
          if(value==='OPTIONAL') return 1;
          if(value==='IMPORTANT') return 2;
          if(value==='NECESSARY') return 3;
          return 1;
        };
        const priorityDiff=priorityRank(a.userPriority)-priorityRank(b.userPriority);
        if(priorityDiff!==0) return priorityDiff;
        const aRatio=a.amount>0?a.historicalMonthlyAverage/a.amount:0;
        const bRatio=b.amount>0?b.historicalMonthlyAverage/b.amount:0;
        if(a.activeMonths90d!==b.activeMonths90d) return a.activeMonths90d-b.activeMonths90d;
        if(aRatio!==bRatio) return aRatio-bRatio;
        return a.transactionCount90d-b.transactionCount90d;
      });

    for(const item of candidates){
      if(remainingGap<=0) break;

      const usageRatio=item.amount>0?item.historicalMonthlyAverage/item.amount:0;
      const stableHistory=type==='FLEXIBLE'&&item.activeMonths90d>=3&&usageRatio>=0.7;
      const lightHistory=type==='FLEXIBLE'&&!stableHistory&&(item.activeMonths90d>0||item.transactionCount90d>0);
      const historySignal:InitialBudgetCorrectionSuggestion['historySignal']=stableHistory?'stable':lightHistory?'light':'none';

      const explicitFloor=item.userPriority==='NECESSARY'
        ? item.amount
        : item.userPriority==='IMPORTANT'
          ? item.amount*0.6
          : 0;
      const historyFloor=stableHistory
        ? Math.min(item.amount,item.historicalMonthlyAverage*0.8)
        : lightHistory
          ? Math.min(item.amount,item.historicalMonthlyAverage*0.5)
          : 0;
      const protectedFloor=Math.max(explicitFloor,historyFloor);
      const reducibleAmount=Math.max(0,item.amount-protectedFloor);
      const reduction=Math.min(reducibleAmount,remainingGap);
      if(reduction<=0) continue;

      const suggestedAmount=Math.max(0,item.amount-reduction);
      correctionSuggestions.push({
        allocationId:item.allocationId,
        itemName:item.name,
        allocationType:item.type,
        currentAmount:item.amount,
        suggestedAmount,
        reduction,
        historicalMonthlyAverage:item.historicalMonthlyAverage,
        activeMonths90d:item.activeMonths90d,
        historySignal,
        userPriority:item.userPriority as InitialBudgetCorrectionSuggestion['userPriority'],
        temporaryContextReason:item.temporaryContextReason as InitialBudgetCorrectionSuggestion['temporaryContextReason'],
        temporaryContextNote:item.temporaryContextNote,
        reason:type==='FLEXIBLE'
          ? item.userPriority==='NECESSARY'
            ? 'حدد المستخدم هذا البند كضروري جدًا، لذلك لا يقترح نماء تخفيضه تلقائيًا.'
            : item.userPriority==='IMPORTANT'
              ? 'حدد المستخدم هذا البند كمهم، لذلك يحافظ نماء على معظم المبلغ ولا يخفض إلا الجزء القابل للمرونة.'
              : item.userPriority==='OPTIONAL'||item.userPriority==='ENTERTAINMENT'
                ? 'حدد المستخدم هذا البند كقابل للتخفيض، لذلك يقدمه نماء قبل البنود الأعلى أولوية.'
                : stableHistory
                  ? 'هذا البند يظهر استخدامًا فعليًا مستقرًا خلال الأشهر الأخيرة؛ لذلك حافظ نماء على حد أدنى قريب من نمط الصرف بدل تصفيره.'
                  : lightHistory
                    ? 'يوجد استخدام فعلي لهذا البند، لذلك اقترح نماء تخفيضًا جزئيًا قبل المساس بالبند بالكامل.'
                    : 'لا يظهر استخدام فعلي حديث لهذا البند، لذلك يُقدَّم كخيار تخفيض أول قبل البنود الأكثر اعتيادًا.'
          : type==='GOAL'
            ? 'تخفيف مساهمة الهدف مؤقتًا بعد استنفاد البنود المرنة الأقل استخدامًا.'
            : 'تخفيف الادخار مؤقتًا فقط إذا لم تكفِ البنود المرنة والأهداف.',
      });
      remainingGap=Math.max(0,remainingGap-reduction);
    }
    if(remainingGap<=0) break;
  }
  const suggestedReductionTotal=correctionSuggestions.reduce((sum,item)=>sum+item.reduction,0);
  const unresolvedGap=remainingGap;

  const protectedCount=items.filter(item=>item.type==='SAVING'||item.type==='EMERGENCY').length;
  if(items.length&&protectedCount===0){
    issues.push({
      code:'NO_EMERGENCY_OR_SAVING',
      severity:'warning',
      message:'المسودة لا تحتوي حاليًا على ادخار أو مخصص طوارئ. هذا لا يمنع الاعتماد، لكنه يستحق المراجعة.',
    });
  }

  return {
    canApprove:!issues.some(issue=>issue.severity==='blocker'),
    income,
    coreTotal,
    total,
    remainingAfterCore:income-coreTotal,
    remainingAfterPlan:income-total,
    itemCount:items.length,
    issues,
    correctionSuggestions,
    suggestedReductionTotal,
    unresolvedGap,
    temporaryFundingPlans,
  };
}
