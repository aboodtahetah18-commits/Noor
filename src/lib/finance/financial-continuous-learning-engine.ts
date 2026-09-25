import { getRawSql } from '@/infrastructure/db/client';

const LEARNING_FACT_KEY='financial_continuous_learning_profile';
const MIN_SAMPLE_SIZE=3;
const MAX_SAMPLE_SIZE=6;

export type FinancialLearningProposal={
  key:string;
  kind:'EXPENSE_BASELINE'|'SAVING_EXPECTATION'|'INCOME_REALIZATION'|'FORECAST_CALIBRATION';
  title:string;
  summary:string;
  sampleSize:number;
  confidence:number;
  currentSignal:number;
  proposedAdjustment:number|null;
  unit:'RATIO'|'PERCENT';
  evidence:string[];
  status:'PROPOSED';
  autoApply:false;
};

export type FinancialLearningProfile={
  version:1;
  updatedAt:string;
  cyclesAnalyzed:number;
  cycleIds:string[];
  metrics:{
    expenseRealizationRatio:number|null;
    savingRealizationRatio:number|null;
    incomeRealizationRatio:number|null;
    forecastErrorPercent:number|null;
  };
  proposals:FinancialLearningProposal[];
  safeguards:{
    minimumSampleSize:number;
    autoApply:false;
    hardRulesMutable:false;
    requiresReview:true;
  };
};

type CycleLearningRow={
  cycleId:string;
  expectedIncome:number;
  actualIncome:number;
  plannedExpense:number;
  actualExpense:number;
  plannedSaving:number;
  actualSaving:number;
  projectedEndBalance:number|null;
  actualEndBalance:number|null;
};

function finite(value:unknown){
  const n=Number(value);
  return Number.isFinite(n)?n:0;
}

function nullableFinite(value:unknown){
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}

function ratio(actual:number,planned:number){
  return planned>0?actual/planned:null;
}

function median(values:number[]){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2?(sorted[mid]??null):(((sorted[mid-1]??0)+(sorted[mid]??0))/2);
}

function bounded(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,value));
}

function relativeDispersion(values:number[],center:number){
  if(values.length<2||center===0)return 0;
  const deviations=values.map(value=>Math.abs(value-center));
  const med=median(deviations)??0;
  return Math.abs(med/center);
}

function confidenceFromSample(sampleSize:number,dispersion:number){
  const sampleScore=Math.min(1,sampleSize/MAX_SAMPLE_SIZE);
  const stabilityScore=bounded(1-dispersion,0,1);
  return Math.round((sampleScore*0.55+stabilityScore*0.45)*100);
}

function makeProposal(args:{
  key:string;
  kind:FinancialLearningProposal['kind'];
  title:string;
  summary:string;
  values:number[];
  currentSignal:number;
  proposedAdjustment:number|null;
  unit:'RATIO'|'PERCENT';
  evidence:string[];
}):FinancialLearningProposal|null{
  if(args.values.length<MIN_SAMPLE_SIZE)return null;
  const center=median(args.values);
  if(center===null)return null;
  const confidence=confidenceFromSample(args.values.length,relativeDispersion(args.values,center));
  if(confidence<55)return null;
  return {
    key:args.key,
    kind:args.kind,
    title:args.title,
    summary:args.summary,
    sampleSize:args.values.length,
    confidence,
    currentSignal:args.currentSignal,
    proposedAdjustment:args.proposedAdjustment,
    unit:args.unit,
    evidence:args.evidence,
    status:'PROPOSED',
    autoApply:false,
  };
}

async function readClosedCycles(userId:string):Promise<CycleLearningRow[]>{
  const sql=getRawSql();
  const rows=await sql`
    select
      cs.cycle_id::text,
      cs.expected_income::text,
      cs.actual_income::text,
      cs.planned_expense::text,
      cs.actual_expense::text,
      cs.planned_saving::text,
      cs.actual_saving::text,
      cs.projected_end_balance_final::text,
      cs.actual_end_balance::text
    from public.cycle_snapshots cs
    join public.financial_cycles fc on fc.id=cs.cycle_id and fc.user_id=cs.user_id
    where cs.user_id=${userId}::uuid
      and fc.status='CLOSED'
    order by fc.start_date desc,fc.created_at desc
    limit ${MAX_SAMPLE_SIZE}
  `;
  return rows.map(row=>({
    cycleId:String(row.cycle_id),
    expectedIncome:finite(row.expected_income),
    actualIncome:finite(row.actual_income),
    plannedExpense:finite(row.planned_expense),
    actualExpense:finite(row.actual_expense),
    plannedSaving:finite(row.planned_saving),
    actualSaving:finite(row.actual_saving),
    projectedEndBalance:nullableFinite(row.projected_end_balance_final),
    actualEndBalance:nullableFinite(row.actual_end_balance),
  }));
}

function evidenceLine(prefix:string,row:CycleLearningRow,a:number,b:number){
  return prefix+' '+row.cycleId+': '+a.toFixed(2)+' مقابل '+b.toFixed(2);
}

export function buildFinancialLearningProfile(rows:CycleLearningRow[]):FinancialLearningProfile{
  const expenseRatios=rows.map(row=>ratio(row.actualExpense,row.plannedExpense)).filter((v):v is number=>v!==null);
  const savingRatios=rows.map(row=>ratio(row.actualSaving,row.plannedSaving)).filter((v):v is number=>v!==null);
  const incomeRatios=rows.map(row=>ratio(row.actualIncome,row.expectedIncome)).filter((v):v is number=>v!==null);
  const forecastErrors=rows
    .filter(row=>row.projectedEndBalance!==null&&row.actualEndBalance!==null)
    .map(row=>Math.abs((row.actualEndBalance??0)-(row.projectedEndBalance??0))/Math.max(1,Math.abs(row.actualIncome))*100);

  const expenseCenter=median(expenseRatios);
  const savingCenter=median(savingRatios);
  const incomeCenter=median(incomeRatios);
  const forecastCenter=median(forecastErrors);
  const proposals:FinancialLearningProposal[]=[];

  if(expenseCenter!==null&&Math.abs(expenseCenter-1)>=0.08){
    const item=makeProposal({
      key:'expense-baseline-calibration',
      kind:'EXPENSE_BASELINE',
      title:'معايرة خط أساس المصروفات',
      summary:expenseCenter>1
        ?'المصروف الفعلي يتجاوز الخطة بصورة متكررة؛ يقترح المحرك مراجعة خط الأساس التنبؤي دون تعديل الخطة تلقائيًا.'
        :'المصروف الفعلي أقل من الخطة بصورة متكررة؛ يقترح المحرك مراجعة خط الأساس بدل الإبقاء على تقدير مرتفع.',
      values:expenseRatios,
      currentSignal:expenseCenter,
      proposedAdjustment:bounded(expenseCenter,0.75,1.35),
      unit:'RATIO',
      evidence:rows.filter(row=>row.plannedExpense>0).map(row=>evidenceLine('المصروف للدورة',row,row.actualExpense,row.plannedExpense)),
    });
    if(item)proposals.push(item);
  }

  if(savingCenter!==null&&Math.abs(savingCenter-1)>=0.1){
    const item=makeProposal({
      key:'saving-expectation-calibration',
      kind:'SAVING_EXPECTATION',
      title:'معايرة توقع الادخار',
      summary:savingCenter<1
        ?'الادخار المحقق أقل من المخطط بصورة متكررة؛ يقترح المحرك مراجعة التوقع أو سبب التعثر.'
        :'الادخار المحقق أعلى من المخطط بصورة متكررة؛ يمكن دراسة رفع التوقع بعد اختبار الاستدامة.',
      values:savingRatios,
      currentSignal:savingCenter,
      proposedAdjustment:bounded(savingCenter,0.7,1.3),
      unit:'RATIO',
      evidence:rows.filter(row=>row.plannedSaving>0).map(row=>evidenceLine('الادخار للدورة',row,row.actualSaving,row.plannedSaving)),
    });
    if(item)proposals.push(item);
  }

  if(incomeCenter!==null&&Math.abs(incomeCenter-1)>=0.08){
    const item=makeProposal({
      key:'income-realization-calibration',
      kind:'INCOME_REALIZATION',
      title:'معايرة تحقق الدخل المتوقع',
      summary:incomeCenter<1
        ?'الدخل المتحقق أقل من المتوقع بصورة متكررة؛ يقترح المحرك جعل التوقع المحافظ أكثر تحفظًا.'
        :'الدخل المتحقق أعلى من المتوقع بصورة متكررة؛ يمكن مراجعة طريقة تقدير الدخل الإضافي.',
      values:incomeRatios,
      currentSignal:incomeCenter,
      proposedAdjustment:bounded(incomeCenter,0.75,1.25),
      unit:'RATIO',
      evidence:rows.filter(row=>row.expectedIncome>0).map(row=>evidenceLine('الدخل للدورة',row,row.actualIncome,row.expectedIncome)),
    });
    if(item)proposals.push(item);
  }

  if(forecastCenter!==null&&forecastCenter>=8){
    const item=makeProposal({
      key:'end-balance-forecast-calibration',
      kind:'FORECAST_CALIBRATION',
      title:'مراجعة دقة توقع نهاية الدورة',
      summary:'خطأ توقع رصيد نهاية الدورة مرتفع عبر عدة دورات؛ يقترح المحرك مراجعة افتراضات التوقع قبل أي تعديل إنتاجي.',
      values:forecastErrors,
      currentSignal:forecastCenter,
      proposedAdjustment:null,
      unit:'PERCENT',
      evidence:rows
        .filter(row=>row.projectedEndBalance!==null&&row.actualEndBalance!==null)
        .map(row=>evidenceLine('رصيد نهاية الدورة',row,row.actualEndBalance??0,row.projectedEndBalance??0)),
    });
    if(item)proposals.push(item);
  }

  return {
    version:1,
    updatedAt:new Date().toISOString(),
    cyclesAnalyzed:rows.length,
    cycleIds:rows.map(row=>row.cycleId),
    metrics:{
      expenseRealizationRatio:expenseCenter,
      savingRealizationRatio:savingCenter,
      incomeRealizationRatio:incomeCenter,
      forecastErrorPercent:forecastCenter,
    },
    proposals,
    safeguards:{
      minimumSampleSize:MIN_SAMPLE_SIZE,
      autoApply:false,
      hardRulesMutable:false,
      requiresReview:true,
    },
  };
}

export async function buildFinancialLearningBrief(userId:string){
  const profile=await calculateFinancialContinuousLearning(userId);
  if(profile.cyclesAnalyzed<MIN_SAMPLE_SIZE){
    return {
      body:'لا توجد دورات مالية مغلقة كافية للتعلم المستمر بعد. أحتاج إلى ثلاث دورات مكتملة على الأقل قبل اقتراح أي معايرة.',
      profile,
    };
  }
  if(!profile.proposals.length){
    return {
      body:'راجعت نتائج الدورات السابقة ولم يظهر نمط متكرر يستحق تعديل التوقعات حاليًا. سأبقي القواعد الحالية كما هي وأواصل القياس.',
      profile,
    };
  }
  const top=profile.proposals
    .slice()
    .sort((a,b)=>b.confidence-a.confidence)
    .slice(0,3);
  return {
    body:'نتائج التعلم المستمر تقترح مراجعة '+top.length+' نقطة دون تطبيق تلقائي: '+top.map(item=>item.title+' ('+item.confidence+'٪ ثقة)').join('، ')+'.',
    profile,
  };
}

export async function calculateFinancialContinuousLearning(userId:string){
  return buildFinancialLearningProfile(await readClosedCycles(userId));
}

export async function refreshFinancialContinuousLearning(userId:string){
  const profile=await calculateFinancialContinuousLearning(userId);
  const sql=getRawSql();
  await sql`
    insert into public.user_foundation_facts(
      user_id,fact_key,category,value_json,source,confidence,verified_at,uses,requires_confirmation,status
    ) values(
      ${userId}::uuid,${LEARNING_FACT_KEY},'learning',${JSON.stringify(profile)}::jsonb,
      'SYSTEM_DERIVED',1,now(),ARRAY['financial_learning','forecasting','governance_review'],false,'ACTIVE'
    )
    on conflict(user_id,fact_key) do update set
      value_json=excluded.value_json,
      source=excluded.source,
      confidence=excluded.confidence,
      verified_at=excluded.verified_at,
      uses=excluded.uses,
      requires_confirmation=false,
      status='ACTIVE',
      updated_at=now()
  `;
  return profile;
}

export async function readFinancialContinuousLearning(userId:string):Promise<FinancialLearningProfile|null>{
  const sql=getRawSql();
  const rows=await sql`
    select value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid
      and fact_key=${LEARNING_FACT_KEY}
      and status='ACTIVE'
    limit 1
  `;
  const value=rows[0]?.value_json;
  return value&&typeof value==='object'&&!Array.isArray(value)?value as FinancialLearningProfile:null;
}
