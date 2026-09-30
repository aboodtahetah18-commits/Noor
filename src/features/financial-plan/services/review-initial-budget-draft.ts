import { rawSql } from '@/infrastructure/db/client';

export type InitialBudgetReviewIssue={
  code:
    | 'NO_ITEMS'
    | 'INCOME_MISSING'
    | 'CORE_OVER_INCOME'
    | 'ZERO_OR_MISSING_AMOUNT'
    | 'TOTAL_OVER_INCOME'
    | 'NO_EMERGENCY_OR_SAVING';
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
    };
  }

  const cycleId=String(plan.cycle_id);
  const [allocationRows,incomeRows,foundationRows]=await Promise.all([
    rawSql`
      select ba.id,bc.name,ba.planned_amount::text,ba.allocation_type,
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

  const items=allocationRows.map(row=>({
    allocationId:String(row.id),
    name:String(row.name??'بند'),
    amount:finite(row.planned_amount),
    type:String(row.allocation_type??''),
    recurrenceKind:String(row.recurrence_kind??'MONTHLY'),
  }));

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

  const correctionSuggestions:InitialBudgetCorrectionSuggestion[]=[];
  let remainingGap=income>0?Math.max(0,total-income):0;
  const correctionPriority=['FLEXIBLE','GOAL','SAVING'];
  for(const type of correctionPriority){
    for(const item of items.filter(candidate=>candidate.type===type&&candidate.amount>0)){
      if(remainingGap<=0) break;
      const reduction=Math.min(item.amount,remainingGap);
      if(reduction<=0) continue;
      const suggestedAmount=Math.max(0,item.amount-reduction);
      correctionSuggestions.push({
        allocationId:item.allocationId,
        itemName:item.name,
        allocationType:item.type,
        currentAmount:item.amount,
        suggestedAmount,
        reduction,
        reason:type==='FLEXIBLE'
          ? 'خفض بند مرن أولًا لأنه الأقل تأثيرًا على الالتزامات الأساسية.'
          : type==='GOAL'
            ? 'تخفيف مساهمة الهدف مؤقتًا بعد استنفاد البنود المرنة.'
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
  };
}
