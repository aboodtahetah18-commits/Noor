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
    | 'PRIORITY_CONFIRMATION_REQUIRED'
    | 'TEMPORARY_NEED_UNFUNDED';
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

export type TemporaryExtraAmountSuggestion={
  allocationId:string;
  itemName:string;
  reason:'TRAVEL'|'OCCASION'|'HEALTH'|'MAINTENANCE'|'UNUSUAL_MONTH'|'OTHER';
  suggestedExtraAmount:number;
  observedMonths:number;
  historicalMonthlyAverage:number;
  historicalMonthlyP75:number;
  historicalMonthlyStdDev:number;
  coefficientOfVariation:number|null;
  confidence:'LOW'|'MEDIUM'|'HIGH';
  confidenceLabel:string;
  historicalMinimum:number;
  historicalMaximum:number;
  suggestedMinimum:number;
  suggestedMaximum:number;
  requiresManualAmount:boolean;
  personalizationApplied:boolean;
  learningConfirmations:number;
  learnedPosition:number|null;
  outcomeCount:number;
  averageErrorRatio:number|null;
  accuracyWeight:number;
  underCount:number;
  overCount:number;
  matchCount:number;
  averageSignedBias:number|null;
  biasAdjustment:number;
  biasApplied:boolean;
  biasLabel:string|null;
  outcomeLabel:string|null;
  basis:string;
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
  temporaryExtraSuggestions:TemporaryExtraAmountSuggestion[];
};

function finite(value:unknown){
  const number=Number(value);
  return Number.isFinite(number)?number:0;
}

function normalizeTemporaryAmountLabel(value:string){
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
      temporaryExtraSuggestions:[],
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

  const monthlyContextRows=categoryIds.length
    ? await rawSql`
        with monthly as (
          select t.category_id,date_trunc('month',t.transaction_date) month_start,
            greatest(
              coalesce(sum(case when t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') then t.amount else 0 end),0)
              - coalesce(sum(case when t.transaction_type='REFUND' then t.amount else 0 end),0),
              0
            ) month_total
          from public.transactions t
          where t.user_id=${userId}::uuid
            and t.category_id=any(${categoryIds}::uuid[])
            and t.status='POSTED'
            and t.transaction_date>=date_trunc('month',current_date)-interval '6 months'
            and t.transaction_date<date_trunc('month',current_date)
            and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT','REFUND')
          group by t.category_id,date_trunc('month',t.transaction_date)
        )
        select category_id,
          count(*)::int observed_months,
          avg(month_total)::text monthly_average,
          percentile_cont(0.75) within group(order by month_total)::text monthly_p75,
          stddev_pop(month_total)::text monthly_stddev,
          max(month_total)::text monthly_max
        from monthly
        group by category_id
      `
    : [];
  const monthlyContextByCategory=new Map(monthlyContextRows.map(row=>[String(row.category_id),{
    observedMonths:Number(row.observed_months??0),
    monthlyAverage:finite(row.monthly_average),
    monthlyP75:finite(row.monthly_p75),
    monthlyStdDev:finite(row.monthly_stddev),
    monthlyMax:finite(row.monthly_max),
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

  const temporaryAmountPreferenceByKey=new Map<string,{confirmationCount:number;averagePosition:number;outcomeCount:number;averageErrorRatio:number|null;accuracyWeight:number;underCount:number;overCount:number;matchCount:number;averageSignedBias:number|null;biasAdjustment:number}>();
  const temporaryAmountLearningTable=await rawSql`select to_regclass('public.budget_temporary_amount_preferences')::text table_name`;
  if((temporaryAmountLearningTable[0] as Record<string,unknown>|undefined)?.table_name){
    const preferenceRows=await rawSql`
      select normalized_label,context_reason,confirmation_count,average_position::text,
        outcome_count,average_error_ratio::text,accuracy_weight::text,
        under_count,over_count,match_count,average_signed_bias::text,bias_adjustment::text
      from public.budget_temporary_amount_preferences
      where user_id=${userId}::uuid
    `;
    for(const row of preferenceRows){
      const normalizedLabel=String(row.normalized_label??'');
      const contextReason=String(row.context_reason??'');
      const confirmationCount=Math.max(0,Number(row.confirmation_count??0));
      const averagePosition=Math.max(0,Math.min(1,finite(row.average_position)));
      if(!normalizedLabel||!contextReason||confirmationCount<=0) continue;
      temporaryAmountPreferenceByKey.set(`${normalizedLabel}:${contextReason}`,{
        confirmationCount,
        averagePosition,
        outcomeCount:Math.max(0,Number(row.outcome_count??0)),
        averageErrorRatio:row.average_error_ratio==null?null:Math.max(0,finite(row.average_error_ratio)),
        accuracyWeight:Math.max(0.25,Math.min(1,finite(row.accuracy_weight)||1)),
        underCount:Math.max(0,Number(row.under_count??0)),
        overCount:Math.max(0,Number(row.over_count??0)),
        matchCount:Math.max(0,Number(row.match_count??0)),
        averageSignedBias:row.average_signed_bias==null?null:finite(row.average_signed_bias),
        biasAdjustment:Math.max(-0.25,Math.min(0.25,finite(row.bias_adjustment))),
      });
    }
  }

  const temporaryExtraSuggestions:TemporaryExtraAmountSuggestion[]=[];
  for(const item of items.filter(candidate=>candidate.temporaryContextReason&&candidate.temporaryExtraAmount<=0)){
    const monthly=monthlyContextByCategory.get(item.categoryId);
    if(!monthly||monthly.observedMonths<2) continue;
    const suggestedExtra=Math.max(0,monthly.monthlyP75-item.amount);
    if(suggestedExtra<=0) continue;

    const coefficientOfVariation=monthly.monthlyAverage>0
      ? monthly.monthlyStdDev/monthly.monthlyAverage
      : null;
    const confidence:TemporaryExtraAmountSuggestion['confidence']=
      monthly.observedMonths>=5&&coefficientOfVariation!==null&&coefficientOfVariation<=0.35
        ? 'HIGH'
        : monthly.observedMonths>=3&&coefficientOfVariation!==null&&coefficientOfVariation<=0.65
          ? 'MEDIUM'
          : 'LOW';
    const confidenceLabel=confidence==='HIGH'
      ? `ثقة عالية — ${monthly.observedMonths} أشهر مكتملة وتذبذب منخفض نسبيًا`
      : confidence==='MEDIUM'
        ? `ثقة متوسطة — ${monthly.observedMonths} أشهر مكتملة مع تذبذب مقبول`
        : coefficientOfVariation===null
          ? `ثقة منخفضة — لا توجد بيانات كافية لقياس استقرار الصرف`
          : `ثقة منخفضة — التاريخ محدود أو الصرف متذبذب بشكل واضح`;

    const historicalMinimum=Math.max(0,monthly.monthlyAverage-item.amount);
    const historicalMaximum=Math.max(suggestedExtra,monthly.monthlyMax-item.amount);
    const historicalSpan=Math.max(0,historicalMaximum-historicalMinimum);
    const learningKey=`${normalizeTemporaryAmountLabel(item.name)}:${String(item.temporaryContextReason)}`;
    const learned=temporaryAmountPreferenceByKey.get(learningKey);
    const personalizationApplied=confidence!=='HIGH'&&historicalSpan>0&&Boolean(learned&&learned.confirmationCount>=3);
    const learnedPosition=personalizationApplied&&learned?learned.averagePosition:null;
    const accuracyWeight=learned?.accuracyWeight??1;
    const outcomeTotal=learned?.outcomeCount??0;
    const underShare=outcomeTotal>0?(learned?.underCount??0)/outcomeTotal:0;
    const overShare=outcomeTotal>0?(learned?.overCount??0)/outcomeTotal:0;
    const biasApplied=Boolean(
      personalizationApplied &&
      learned &&
      outcomeTotal>=3 &&
      Math.max(underShare,overShare)>=0.7
    );
    const basePosition=personalizationApplied&&learned
      ? 0.5+(learned.averagePosition-0.5)*accuracyWeight
      : 0.5;
    const blendedPosition=Math.max(
      0,
      Math.min(
        1,
        basePosition+(biasApplied&&learned?learned.biasAdjustment:0)
      )
    );
    const biasLabel=biasApplied&&learned
      ? underShare>=0.7
        ? `صحح نماء النطاق للأعلى لأن ${Math.round(underShare*100)}% من النتائج السابقة كانت أعلى من التقدير`
        : `صحح نماء النطاق للأسفل لأن ${Math.round(overShare*100)}% من النتائج السابقة كانت أقل من التقدير`
      : null;
    const halfWidthBase=learned&&learned.confirmationCount>=6?0.15:0.25;
    const halfWidth=Math.min(0.4,halfWidthBase+(1-accuracyWeight)*0.2);
    const personalizedMinimum=personalizationApplied&&learned
      ? historicalMinimum+Math.max(0,blendedPosition-halfWidth)*historicalSpan
      : historicalMinimum;
    const personalizedMaximum=personalizationApplied&&learned
      ? historicalMinimum+Math.min(1,blendedPosition+halfWidth)*historicalSpan
      : historicalMaximum;
    const learnedCenter=personalizationApplied
      ? historicalMinimum+blendedPosition*historicalSpan
      : suggestedExtra;
    const adjustedSuggested=Math.max(personalizedMinimum,Math.min(personalizedMaximum,learnedCenter));
    const outcomeLabel=learned&&learned.outcomeCount>0
      ? learned.averageErrorRatio!==null&&learned.averageErrorRatio<=0.2
        ? `النتائج السابقة دقيقة نسبيًا — متوسط الخطأ ${Math.round(learned.averageErrorRatio*100)}%`
        : learned.averageErrorRatio!==null&&learned.averageErrorRatio<=0.5
          ? `النتائج السابقة متوسطة الدقة — متوسط الخطأ ${Math.round(learned.averageErrorRatio*100)}%`
          : learned.averageErrorRatio!==null
            ? `النتائج السابقة متذبذبة — متوسط الخطأ ${Math.round(learned.averageErrorRatio*100)}%`
            : null
      : null;

    temporaryExtraSuggestions.push({
      allocationId:item.allocationId,
      itemName:item.name,
      reason:item.temporaryContextReason as TemporaryExtraAmountSuggestion['reason'],
      suggestedExtraAmount:Number(adjustedSuggested.toFixed(2)),
      observedMonths:monthly.observedMonths,
      historicalMonthlyAverage:monthly.monthlyAverage,
      historicalMonthlyP75:monthly.monthlyP75,
      historicalMonthlyStdDev:monthly.monthlyStdDev,
      coefficientOfVariation:coefficientOfVariation===null?null:Number(coefficientOfVariation.toFixed(4)),
      confidence,
      confidenceLabel,
      historicalMinimum:Number(historicalMinimum.toFixed(2)),
      historicalMaximum:Number(historicalMaximum.toFixed(2)),
      suggestedMinimum:Number(personalizedMinimum.toFixed(2)),
      suggestedMaximum:Number(personalizedMaximum.toFixed(2)),
      requiresManualAmount:confidence!=='HIGH',
      personalizationApplied,
      learningConfirmations:learned?.confirmationCount??0,
      learnedPosition:learnedPosition===null?null:Number(learnedPosition.toFixed(4)),
      outcomeCount:learned?.outcomeCount??0,
      averageErrorRatio:learned?.averageErrorRatio??null,
      accuracyWeight:Number(accuracyWeight.toFixed(4)),
      underCount:learned?.underCount??0,
      overCount:learned?.overCount??0,
      matchCount:learned?.matchCount??0,
      averageSignedBias:learned?.averageSignedBias??null,
      biasAdjustment:Number((biasApplied&&learned?learned.biasAdjustment:0).toFixed(4)),
      biasApplied,
      biasLabel,
      outcomeLabel,
      basis:confidence==='HIGH'
        ? `التقدير مبني على الربع الأعلى من الصرف الشهري الفعلي لهذا البند خلال ${monthly.observedMonths} أشهر مكتملة، بعد استبعاد الشهر الجاري.`
        : personalizationApplied&&learned
          ? `خصص نماء النطاق بناءً على ${learned.confirmationCount} اختيارات سابقة لك لنفس البند والظرف، مع إبقائه داخل الحدود التاريخية الفعلية.`
          : `النطاق مبني على متوسطك الشهري الفعلي وحتى أعلى شهر مكتمل مسجل لهذا البند خلال فترة القياس. اختر المبلغ النهائي المناسب للظرف الحالي.`,
    });
  }

  const temporaryFundingPlans:TemporaryBudgetFundingPlan[]=[];
  let freeMarginRemaining=income>0?Math.max(0,income-total):0;
  const reservedReductionByAllocation=new Map<string,number>();
  const contextualTargets=items.filter(item=>item.temporaryContextReason&&item.temporaryExtraAmount>0);

  for(const target of contextualTargets){
    let remaining=target.temporaryExtraAmount;
    const availableFromFreeMargin=freeMarginRemaining;
    const fundedFromFreeMargin=Math.min(freeMarginRemaining,remaining);
    freeMarginRemaining=Math.max(0,freeMarginRemaining-fundedFromFreeMargin);
    remaining-=fundedFromFreeMargin;

    const sourceReductions:TemporaryBudgetFundingSource[]=[];
    const fundingCandidates=items
      .filter(item=>
        item.allocationId!==target.allocationId &&
        item.temporaryExtraAmount<=0 &&
        item.amount>0 &&
        ['FLEXIBLE','GOAL','SAVING'].includes(item.type)
      )
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
      const alreadyReserved=reservedReductionByAllocation.get(source.allocationId)??0;
      const effectiveAmount=Math.max(0,source.amount-alreadyReserved);
      if(effectiveAmount<=0) continue;

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
      const protectedFloor=Math.max(explicitFloor,historyFloor);
      const reducible=Math.max(0,effectiveAmount-protectedFloor);
      const reduction=Math.min(reducible,remaining);
      if(reduction<=0) continue;

      const totalReserved=alreadyReserved+reduction;
      reservedReductionByAllocation.set(source.allocationId,totalReserved);
      sourceReductions.push({
        allocationId:source.allocationId,
        itemName:source.name,
        allocationType:source.type,
        currentAmount:effectiveAmount,
        suggestedAmount:Math.max(0,effectiveAmount-reduction),
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
      availableFromFreeMargin,
      fundedFromFreeMargin,
      sourceReductions,
      fundedTotal,
      unresolvedAmount:Math.max(0,remaining),
    });
  }

  for(const plan of temporaryFundingPlans){
    issues.push({
      code:'TEMPORARY_NEED_UNFUNDED',
      severity:'blocker',
      message:plan.unresolvedAmount>0
        ? `بند «${plan.targetItemName}» يحتاج زيادة مؤقتة قدرها ${plan.extraAmount.toFixed(2)} ريال، وما زال ${plan.unresolvedAmount.toFixed(2)} ريال بلا تغطية آمنة.`
        : `بند «${plan.targetItemName}» لديه زيادة مؤقتة قدرها ${plan.extraAmount.toFixed(2)} ريال. راجع خطة التغطية وطبّقها قبل اعتماد الميزانية.`,
      itemName:plan.targetItemName,
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
    temporaryExtraSuggestions,
  };
}
