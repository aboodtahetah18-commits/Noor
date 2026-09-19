import { getRawSql } from '@/infrastructure/db/client';

export type AllocationClaimState='READY'|'PARTIAL'|'NEEDS_EVIDENCE'|'NO_CLAIM';
export type AllocationClaim={
  ownerKey:'budget-spending-owner'|'obligations-owner'|'goals-owner'|'investment-owner'|'liquidity-protection-owner';
  ownerName:string;
  requestedAmount:number|null;
  minimumAmount:number|null;
  idealAmount:number|null;
  claimState:AllocationClaimState;
  rationale:string[];
  impactIfReduced:string;
  evidence:string[];
  missingEvidence:string[];
};

export type FinancialCycleAllocationSnapshot={
  availableIncome:number|null;
  budgetPlannedAmount:number|null;
  knownHouseholdEssentials:number;
  monthlyObligations:number;
  monthlyGoalNeed:number|null;
  liquidBalance:number|null;
  liquidityTarget:number|null;
  investableOpportunityAmount:number|null;
  cycleId:string|null;
  evidence:string[];
};

function money(value:unknown){
  const n=typeof value==='number'?value:Number(value);
  return Number.isFinite(n)&&n>=0?n:0;
}
function monthlyEquivalent(item:Record<string,unknown>){
  const amount=money(item.amount);
  const recurrence=String(item.recurrence??'MONTHLY').toUpperCase();
  if(recurrence==='WEEKLY') return amount*52/12;
  if(recurrence==='YEARLY'||recurrence==='ANNUAL') return amount/12;
  if(recurrence==='QUARTERLY') return amount/3;
  return amount;
}
function monthsUntil(targetDate:string|null,now=new Date()){
  if(!targetDate) return null;
  const date=new Date(targetDate+'T00:00:00Z');
  if(Number.isNaN(date.getTime())) return null;
  const raw=(date.getUTCFullYear()-now.getUTCFullYear())*12+(date.getUTCMonth()-now.getUTCMonth());
  return Math.max(1,date.getUTCDate()>=now.getUTCDate()?raw:raw-1);
}

export function buildFinancialResponsibilityClaims(snapshot:FinancialCycleAllocationSnapshot):AllocationClaim[]{
  const income=snapshot.availableIncome;
  const obligations=snapshot.monthlyObligations;
  const budget=snapshot.budgetPlannedAmount??(snapshot.knownHouseholdEssentials>0?snapshot.knownHouseholdEssentials:null);
  const goals=snapshot.monthlyGoalNeed;
  const liquidityGap=snapshot.liquidityTarget!==null&&snapshot.liquidBalance!==null
    ? Math.max(0,snapshot.liquidityTarget-snapshot.liquidBalance)
    : null;

  const protectedKnown=[budget,obligations,goals,liquidityGap].reduce<number>((sum,value)=>sum+(typeof value==='number'?value:0),0);
  const residual=income===null?null:Math.max(0,income-protectedKnown);
  const opportunity=snapshot.investableOpportunityAmount;
  const investmentRequest=residual!==null&&opportunity!==null?Math.min(residual,opportunity):null;

  return [
    {
      ownerKey:'budget-spending-owner',ownerName:'مسؤول الميزانية والإنفاق',
      requestedAmount:budget,minimumAmount:budget,idealAmount:budget,
      claimState:budget===null?'NEEDS_EVIDENCE':snapshot.budgetPlannedAmount!==null?'READY':'PARTIAL',
      rationale:budget===null
        ? ['لا توجد بعد خطة بنود معتمدة أو بيانات كافية لحساب مصروف الدورة دون افتراض.']
        : [snapshot.budgetPlannedAmount!==null?'المطالبة مبنية على خطة البنود الحالية.':'المطالبة مبنية فقط على الأساسيات الأسرية المثبتة حتى تكتمل خطة البنود.'],
      impactIfReduced:'أي خفض يجب أن يحدد البند المتأثر، ولا يجوز أن يصنع عجزًا في أساسيات مثبتة.',
      evidence:snapshot.budgetPlannedAmount!==null?['الخطة المالية الحالية']:snapshot.knownHouseholdEssentials>0?['حقائق التأسيس الأسرية والسكن']:[],
      missingEvidence:snapshot.budgetPlannedAmount===null?['خطة بنود معتمدة للدورة']:[],
    },
    {
      ownerKey:'obligations-owner',ownerName:'مسؤول الالتزامات',
      requestedAmount:obligations,minimumAmount:obligations,idealAmount:obligations,
      claimState:obligations>0?'READY':'NO_CLAIM',
      rationale:obligations>0?['المبلغ يساوي الالتزامات الشهرية المثبتة أو مكافئها الشهري.']:['لا توجد التزامات مالية مثبتة في البيانات الحالية.'],
      impactIfReduced:'الخفض قبل تعديل الالتزام فعليًا قد يؤدي إلى نقص تغطية أو تأخير استحقاق.',
      evidence:obligations>0?['سجل الالتزامات المثبت']:[],
      missingEvidence:[],
    },
    {
      ownerKey:'goals-owner',ownerName:'مسؤول الأهداف',
      requestedAmount:goals,minimumAmount:goals,idealAmount:goals,
      claimState:goals===null?'NEEDS_EVIDENCE':goals>0?'READY':'NO_CLAIM',
      rationale:goals===null?['يوجد هدف دون موعد كافٍ لحساب المساهمة الدورية دون افتراض.']:goals>0?['المبلغ يجمع المساهمات الشهرية اللازمة للأهداف ذات المبلغ والموعد المثبتين.']:['لا توجد مساهمة هدف مطلوبة في البيانات الحالية.'],
      impactIfReduced:'يجب إظهار مقدار تأخر كل هدف أو تغير احتمالية الوصول إليه قبل قبول الخفض.',
      evidence:goals!==null&&goals>0?['سجل الأهداف ومواعيدها']:[],
      missingEvidence:goals===null?['موعد أو مدة للأهداف غير المكتملة']:[],
    },
    {
      ownerKey:'liquidity-protection-owner',ownerName:'مسؤول السيولة والحماية',
      requestedAmount:liquidityGap,minimumAmount:liquidityGap,idealAmount:liquidityGap,
      claimState:liquidityGap===null?'NEEDS_EVIDENCE':liquidityGap>0?'READY':'NO_CLAIM',
      rationale:liquidityGap===null?['لن أختلق نسبة احتياط. أحتاج حد حماية معتمدًا ورصيد سيولة موثوقًا قبل المطالبة بمبلغ.']:liquidityGap>0?['المطالبة تساوي فجوة السيولة بين الرصيد الموثق وحد الحماية المعتمد.']:['السيولة الحالية لا تقل عن حد الحماية المعتمد.'],
      impactIfReduced:'إذا بقيت فجوة حماية، فالخفض يطيل زمن الوصول إلى الحد الآمن ويجب توثيق أثره.',
      evidence:liquidityGap!==null?['رصيد السيولة الموثق','حد الحماية المعتمد']:[],
      missingEvidence:liquidityGap===null?['حد حماية معتمد','رصيد سيولة موثوق']:[],
    },
    {
      ownerKey:'investment-owner',ownerName:'مسؤول الاستثمار',
      requestedAmount:investmentRequest,minimumAmount:investmentRequest===null?null:0,idealAmount:investmentRequest,
      claimState:investmentRequest===null?'NEEDS_EVIDENCE':investmentRequest>0?'READY':'NO_CLAIM',
      rationale:investmentRequest===null?['لا توجد مطالبة استثمارية رقمية قبل معرفة الفائض المحمي وفرصة استثمار مناسبة.']:investmentRequest>0?['المطالبة لا تتجاوز الفائض بعد المطالب المحمية ولا قيمة الفرصة المؤهلة.']:['لا يوجد فائض مؤهل أو فرصة مؤهلة في هذه الدورة.'],
      impactIfReduced:'خفض الاستثمار يؤخر النمو المتوقع، لكنه لا يتقدم على الالتزامات أو الحماية أو الأساسيات.',
      evidence:investmentRequest!==null?['الفائض بعد المطالب المحمية','فرصة استثمار مؤهلة']:[],
      missingEvidence:investmentRequest===null?['فائض محمي محسوب','فرصة استثمار مؤهلة من بنك الأصول']:[],
    },
  ];
}

export function summarizeAllocationConflict(snapshot:FinancialCycleAllocationSnapshot,claims:AllocationClaim[]){
  const income=snapshot.availableIncome;
  const numericClaims=claims.filter(c=>c.requestedAmount!==null);
  const requested=numericClaims.reduce((sum,c)=>sum+(c.requestedAmount??0),0);
  const unknown=claims.filter(c=>c.requestedAmount===null).map(c=>c.ownerName);
  return {
    available_income:income,
    known_requested_total:requested,
    known_gap:income===null?null:income-requested,
    conflict:income!==null&&requested>income,
    unresolved_owners:unknown,
    ready_for_ratification:income!==null&&unknown.length===0&&requested<=income,
  };
}

export async function getFinancialCycleAllocationSnapshot(userId:string):Promise<FinancialCycleAllocationSnapshot>{
  const sql=getRawSql();
  const [factRows,cycleRows,planRows,liquidRows]=await Promise.all([
    sql`select fact_key,value_json from public.user_foundation_facts where user_id=${userId}::uuid and status='ACTIVE' and fact_key in ('income','housing','dependents','obligations','goals')`,
    sql`select id from public.financial_cycles where user_id=${userId}::uuid and status in ('ACTIVE','DRAFT') order by case when status='ACTIVE' then 0 else 1 end, created_at desc limit 1`,
    sql`
      select coalesce(sum(ba.planned_amount),0)::text as total
      from public.financial_plans fp
      join public.plan_versions pv on pv.id=fp.current_version_id and pv.user_id=fp.user_id
      join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.user_id=fp.user_id
      where fp.user_id=${userId}::uuid and fp.status in ('PLAN_DRAFT','APPROVED','ACTIVE')
    `,
    sql`
      select coalesce(sum(aob.amount),0)::text as total
      from public.account_opening_balances aob
      join public.accounts a on a.id=aob.account_id and a.user_id=aob.user_id
      where aob.user_id=${userId}::uuid and a.is_active=true
    `,
  ]);
  const facts=new Map(factRows.map(row=>[String(row.fact_key),row.value_json]));
  const incomeFact=facts.get('income') as Record<string,unknown>|undefined;
  const availableIncome=typeof incomeFact?.actual_net==='number'?incomeFact.actual_net:null;

  const obligationsFact=facts.get('obligations') as Record<string,unknown>|undefined;
  const obligationItems=Array.isArray(obligationsFact?.items)?obligationsFact.items.filter((x):x is Record<string,unknown>=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x)):[];
  const monthlyObligations=obligationItems.reduce((sum,item)=>sum+monthlyEquivalent(item),0);

  const dependentFact=facts.get('dependents') as Record<string,unknown>|undefined;
  const dependentItems=Array.isArray(dependentFact?.items)?dependentFact.items.filter((x):x is Record<string,unknown>=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x)):[];
  const dependentSupport=dependentItems.reduce((sum,item)=>sum+money(item.monthly_support),0);
  const housingFact=facts.get('housing') as Record<string,unknown>|undefined;
  const housingNumbers=Array.isArray(housingFact?.numbers)?housingFact.numbers.map(money):[];
  const housingRaw=String(housingFact?.raw??'');
  const housingCost=/إيجار|ايجار/.test(housingRaw)?(housingNumbers[0]??0):0;

  const goalsFact=facts.get('goals') as Record<string,unknown>|undefined;
  const goalItems=Array.isArray(goalsFact?.items)?goalsFact.items.filter((x):x is Record<string,unknown>=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x)):[];
  let monthlyGoalNeed:number|null=0;
  for(const goal of goalItems){
    const months=monthsUntil(typeof goal.target_date==='string'?goal.target_date:null);
    if(months===null){monthlyGoalNeed=null;break;}
    const remaining=Math.max(0,money(goal.target_amount)-money(goal.allocated_amount));
    monthlyGoalNeed=(monthlyGoalNeed??0)+(remaining/months);
  }

  const budgetPlanned=money(planRows[0]?.total);
  const liquid=money(liquidRows[0]?.total);
  return {
    availableIncome,
    budgetPlannedAmount:budgetPlanned>0?budgetPlanned:null,
    knownHouseholdEssentials:dependentSupport+housingCost,
    monthlyObligations,
    monthlyGoalNeed,
    liquidBalance:liquid>0?liquid:null,
    liquidityTarget:null,
    investableOpportunityAmount:null,
    cycleId:cycleRows[0]?.id?String(cycleRows[0].id):null,
    evidence:['حقائق التأسيس','الخطة المالية إن وجدت','الأرصدة الافتتاحية الموثقة'],
  };
}
