import { getRawSql } from '@/infrastructure/db/client';
import { getLivePersonalBudgetCalculation } from '@/lib/finance/live-personal-budget-calculation';
import {
  getFinancialDecisionLearningContext,
  type FinancialDecisionLearningContext,
  type FinancialDecisionLearningDomain,
} from '@/lib/finance/financial-learning-decision-context';

export type FinancialDecisionExplanation={
  domain:FinancialDecisionLearningDomain;
  current:{
    label:string;
    value:string;
    secondary:string[];
    source:'personal-budget-calculation-engine';
  };
  rule:{
    code:string;
    title:string;
    description:string;
  };
  memory:{
    summary:string|null;
    at:string|null;
    source:'conversation'|'none';
  };
  learning:FinancialDecisionLearningContext|null;
  why:string;
  shortText:string;
  guardrails:{
    externalExecution:false;
    hardRulesOverride:false;
    learningCanOverrideCurrentFacts:false;
  };
};

const DOMAIN_ROLE:Record<FinancialDecisionLearningDomain,string>={
  budget_spending:'budget-spending-owner',
  liquidity_protection:'liquidity-protection-owner',
  goals:'goals-owner',
  obligations:'obligations-owner',
  investment:'investment-owner',
  forecast:'central-governor',
};

const RULES:Record<FinancialDecisionLearningDomain,FinancialDecisionExplanation['rule']>={
  budget_spending:{
    code:'RULE-BUDGET-TRUE-AVAILABLE',
    title:'الإنفاق يبنى على المتاح الحقيقي لا الرصيد الخام',
    description:'القرار يعتمد على الموارد التشغيلية بعد خصم الالتزامات والحماية والأساسيات ومخصصات الأهداف، ثم يقارن التنفيذ بالخطة.',
  },
  liquidity_protection:{
    code:'RULE-LIQUIDITY-PROTECT-FIRST',
    title:'الحماية والالتزامات تسبق التوسع في الصرف',
    description:'أي فجوة في الحماية أو عجز تشغيلي تمنع التوسع الاختياري حتى تتضح البيانات أو تعالج الفجوة.',
  },
  goals:{
    code:'RULE-GOAL-SAFE-CONTRIBUTION',
    title:'تمويل الهدف لا يتجاوز القدرة الآمنة',
    description:'مساهمة الهدف تقاس بعد حماية الالتزامات والأساسيات والسيولة، ولا تعتمد على دخل متوقع غير متحقق كأنه نقد متاح.',
  },
  obligations:{
    code:'RULE-OBLIGATIONS-PROTECTED',
    title:'الالتزامات المثبتة محمية قبل الإنفاق المرن',
    description:'المبالغ المرتبطة بالتزامات قائمة لا تعامل كسيولة حرة، وأي تأخر يحتاج تحققًا قبل إعادة التخصيص.',
  },
  investment:{
    code:'RULE-INVEST-SURPLUS-ONLY',
    title:'الاستثمار من الفائض الحقيقي فقط',
    description:'لا تعتبر الأموال المحجوزة أو المحمية أو اللازمة للأساسيات فائضًا استثماريًا حتى لو كانت ظاهرة في الرصيد البنكي.',
  },
  forecast:{
    code:'RULE-FORECAST-SOFT-NOT-FACT',
    title:'التوقع طبقة مساعدة وليس حقيقة مالية',
    description:'التوقعات المتعلمة تستخدم لترجيح المستقبل فقط، بينما المتاح والعجز الحاليان يبقيان مبنيين على البيانات المتحققة والحساب الصلب.',
  },
};

function sar(value:string|null|undefined){
  if(value==null)return 'غير متاح';
  const n=Number(value);
  if(!Number.isFinite(n))return value;
  return new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:2}).format(n)+' ر.س';
}

function pct(value:string|null|undefined){
  if(value==null)return 'غير متاح';
  const n=Number(value);
  if(!Number.isFinite(n))return value;
  return new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:1}).format(n)+'٪';
}

function currentForDomain(
  domain:FinancialDecisionLearningDomain,
  live:Awaited<ReturnType<typeof getLivePersonalBudgetCalculation>>,
):FinancialDecisionExplanation['current']{
  if(!live){
    return {label:'القراءة الحالية',value:'غير متاحة',secondary:[],source:'personal-budget-calculation-engine'};
  }
  const values=live.calculation.values;
  if(domain==='budget_spending'){
    return {
      label:'المتاح الحقيقي',
      value:sar(values.trueAvailable),
      secondary:['استخدام الخطة '+pct(values.utilizationPercent),'الحد اليومي '+sar(values.dailyGuidance)],
      source:'personal-budget-calculation-engine',
    };
  }
  if(domain==='liquidity_protection'){
    return {
      label:'العجز التشغيلي',
      value:sar(values.operatingDeficit),
      secondary:['الحماية المطلوبة '+sar(values.requiredProtection),'المتاح الحقيقي '+sar(values.trueAvailable)],
      source:'personal-budget-calculation-engine',
    };
  }
  if(domain==='goals'){
    const goal=live.goals[0]??null;
    return {
      label:goal?'المتبقي للهدف':'المتاح الحقيقي',
      value:goal?sar(goal.remainingAmount):sar(values.trueAvailable),
      secondary:goal?['المساهمة المطلوبة '+sar(goal.requiredContribution)]:['لا يوجد هدف نشط قابل للحساب'],
      source:'personal-budget-calculation-engine',
    };
  }
  if(domain==='obligations'){
    return {
      label:'الالتزامات المحمية',
      value:sar(values.protectedObligations),
      secondary:['العجز التشغيلي '+sar(values.operatingDeficit)],
      source:'personal-budget-calculation-engine',
    };
  }
  if(domain==='investment'){
    return {
      label:'الفائض الحقيقي',
      value:sar(values.trueSurplus),
      secondary:['المتاح الحقيقي '+sar(values.trueAvailable),'الحماية المطلوبة '+sar(values.requiredProtection)],
      source:'personal-budget-calculation-engine',
    };
  }
  return {
    label:'رصيد نهاية الدورة المتوقع',
    value:live.softForecast.learnedProjectedEndBalance,
    secondary:[
      'التوقع المتعلم '+(live.softForecast.active?'نشط':'غير نشط'),
      'المتاح الحقيقي الحالي '+sar(values.trueAvailable),
    ],
    source:'personal-budget-calculation-engine',
  };
}

async function previousDecisionMemory(userId:string,domain:FinancialDecisionLearningDomain){
  const sql=getRawSql();
  const roleKey=DOMAIN_ROLE[domain];
  const rows=await sql`
    select body,created_at,structured_data
    from public.conversation_messages
    where user_id=${userId}::uuid
      and (
        (sender_type='user' and structured_data->>'scope_kind'='role' and structured_data->>'role_key'=${roleKey})
        or
        (sender_type='agent' and (
          structured_data->>'committee_decision' is not null
          or structured_data->>'committee_context_note' is not null
        ))
      )
    order by created_at desc
    limit 12
  `;
  for(const row of rows){
    const body=String(row.body??'').trim();
    const data=row.structured_data&&typeof row.structured_data==='object'&&!Array.isArray(row.structured_data)
      ?row.structured_data as Record<string,unknown>
      :{};
    const context=typeof data.committee_context_note==='string'?data.committee_context_note.trim():'';
    const decision=typeof data.committee_decision==='string'?data.committee_decision.trim():'';
    const summary=(context||decision||body).slice(0,240);
    if(!summary)continue;
    return {
      summary,
      at:row.created_at?String(row.created_at):null,
      source:'conversation' as const,
    };
  }
  return {summary:null,at:null,source:'none' as const};
}

function whyText(
  current:FinancialDecisionExplanation['current'],
  rule:FinancialDecisionExplanation['rule'],
  memory:FinancialDecisionExplanation['memory'],
  learning:FinancialDecisionLearningContext|null,
){
  const memoryPart=memory.summary?' وهناك سياق سابق محفوظ يؤثر على القراءة الحالية.':' ولا يوجد سياق سابق موثق يغير القراءة الحالية.';
  const learningPart=learning
    ?learning.decisionUse==='SUPPORT'
      ?' كما أن سجل التعلم يدعم الاتجاه الحالي.'
      :learning.decisionUse==='CAUTION'
        ?' لكن سجل التعلم يفرض الحذر لأنه يتضمن تجربة سابقة غير مستقرة أو متراجَعًا عنها.'
        :' ويوجد تعلم سابق، لكنه غير مؤهل وحده للتأثير على القرار.'
    :' ولا يوجد تعلم خوارزمي سابق مناسب لهذا المجال حتى الآن.';
  return 'اخترت هذه القراءة لأن '+current.label+' هو '+current.value+'، وتطبق قاعدة «'+rule.title+'».'+memoryPart+learningPart;
}

export function composeFinancialDecisionExplanation(
  domain:FinancialDecisionLearningDomain,
  current:FinancialDecisionExplanation['current'],
  memory:FinancialDecisionExplanation['memory'],
  learning:FinancialDecisionLearningContext|null,
):FinancialDecisionExplanation{
  const rule=RULES[domain];
  const why=whyText(current,rule,memory,learning);
  const memoryText=memory.summary?' الذاكرة السابقة: '+memory.summary+'.':'';
  const learningText=learning?' '+learning.shortText:'';
  return {
    domain,
    current,
    rule,
    memory,
    learning,
    why,
    shortText:current.label+': '+current.value+'. القاعدة: '+rule.title+'.'+memoryText+learningText+' '+why,
    guardrails:{
      externalExecution:false,
      hardRulesOverride:false,
      learningCanOverrideCurrentFacts:false,
    },
  };
}

export async function getFinancialDecisionExplanation(
  userId:string,
  domain:FinancialDecisionLearningDomain,
):Promise<FinancialDecisionExplanation>{
  const [live,memory,learning]=await Promise.all([
    getLivePersonalBudgetCalculation(userId).catch(()=>null),
    previousDecisionMemory(userId,domain).catch(()=>({summary:null,at:null,source:'none' as const})),
    getFinancialDecisionLearningContext(userId,domain).catch(()=>null),
  ]);
  const current=currentForDomain(domain,live);
  return composeFinancialDecisionExplanation(domain,current,memory,learning);
}
