export type FinancialLearningBacktestKind=
  |'EXPENSE_BASELINE'
  |'SAVING_EXPECTATION'
  |'INCOME_REALIZATION'
  |'FORECAST_CALIBRATION';

export type FinancialLearningBacktestRow={
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

export type FinancialLearningBacktestCycle={
  cycleId:string;
  baselinePrediction:number;
  candidatePrediction:number;
  actual:number;
  baselineErrorPercent:number;
  candidateErrorPercent:number;
  localAdjustment:number;
};

export type FinancialLearningBacktestResult={
  status:'PASSED'|'FAILED'|'REVIEW_ONLY'|'INSUFFICIENT_DATA';
  sampleSize:number;
  baselineMaePercent:number|null;
  candidateMaePercent:number|null;
  improvementPercent:number|null;
  worstCycleDegradationPercent:number|null;
  passed:boolean;
  reason:string;
  cycles:FinancialLearningBacktestCycle[];
};

function median(values:number[]){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2
    ?sorted[mid]??null
    :((sorted[mid-1]??0)+(sorted[mid]??0))/2;
}

function bounded(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,value));
}

function mean(values:number[]){
  return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
}

function errorPercent(prediction:number,actual:number){
  return Math.abs(prediction-actual)/Math.max(1,Math.abs(actual))*100;
}

function ratioForKind(row:FinancialLearningBacktestRow,kind:FinancialLearningBacktestKind){
  if(kind==='EXPENSE_BASELINE')return row.plannedExpense>0?row.actualExpense/row.plannedExpense:null;
  if(kind==='SAVING_EXPECTATION')return row.plannedSaving>0?row.actualSaving/row.plannedSaving:null;
  if(kind==='INCOME_REALIZATION')return row.expectedIncome>0?row.actualIncome/row.expectedIncome:null;
  return null;
}

function predictionInputs(row:FinancialLearningBacktestRow,kind:FinancialLearningBacktestKind){
  if(kind==='EXPENSE_BASELINE')return {base:row.plannedExpense,actual:row.actualExpense,min:0.75,max:1.35};
  if(kind==='SAVING_EXPECTATION')return {base:row.plannedSaving,actual:row.actualSaving,min:0.7,max:1.3};
  if(kind==='INCOME_REALIZATION')return {base:row.expectedIncome,actual:row.actualIncome,min:0.75,max:1.25};
  return null;
}

export function backtestFinancialLearningAdjustment(
  rows:FinancialLearningBacktestRow[],
  kind:FinancialLearningBacktestKind,
):FinancialLearningBacktestResult{
  if(kind==='FORECAST_CALIBRATION'){
    const usable=rows.filter(row=>row.projectedEndBalance!==null&&row.actualEndBalance!==null);
    return {
      status:usable.length>=3?'REVIEW_ONLY':'INSUFFICIENT_DATA',
      sampleSize:usable.length,
      baselineMaePercent:usable.length
        ?mean(usable.map(row=>errorPercent(row.projectedEndBalance??0,row.actualEndBalance??0)))
        :null,
      candidateMaePercent:null,
      improvementPercent:null,
      worstCycleDegradationPercent:null,
      passed:false,
      reason:usable.length>=3
        ?'المقترح يطلب مراجعة نموذج التوقع نفسه ولا يملك معامل معايرة رقميًا آمنًا للاختبار التلقائي.'
        :'لا توجد دورات كافية لاختبار دقة توقع نهاية الدورة.',
      cycles:[],
    };
  }

  const eligible=rows.filter(row=>{
    const values=predictionInputs(row,kind);
    return Boolean(values&&values.base>0);
  });
  if(eligible.length<3){
    return {
      status:'INSUFFICIENT_DATA',
      sampleSize:eligible.length,
      baselineMaePercent:null,
      candidateMaePercent:null,
      improvementPercent:null,
      worstCycleDegradationPercent:null,
      passed:false,
      reason:'يحتاج الاختبار الخلفي إلى ثلاث دورات قابلة للمقارنة على الأقل.',
      cycles:[],
    };
  }

  const cycles:FinancialLearningBacktestCycle[]=[];
  for(const heldOut of eligible){
    const train=eligible
      .filter(row=>row.cycleId!==heldOut.cycleId)
      .map(row=>ratioForKind(row,kind))
      .filter((value):value is number=>value!==null);
    const center=median(train);
    const input=predictionInputs(heldOut,kind);
    if(center===null||!input)continue;
    const localAdjustment=bounded(center,input.min,input.max);
    const baselinePrediction=input.base;
    const candidatePrediction=input.base*localAdjustment;
    cycles.push({
      cycleId:heldOut.cycleId,
      baselinePrediction,
      candidatePrediction,
      actual:input.actual,
      baselineErrorPercent:errorPercent(baselinePrediction,input.actual),
      candidateErrorPercent:errorPercent(candidatePrediction,input.actual),
      localAdjustment,
    });
  }

  if(cycles.length<3){
    return {
      status:'INSUFFICIENT_DATA',
      sampleSize:cycles.length,
      baselineMaePercent:null,
      candidateMaePercent:null,
      improvementPercent:null,
      worstCycleDegradationPercent:null,
      passed:false,
      reason:'لم ينتج عدد كافٍ من دورات الاختبار بعد استبعاد البيانات غير الصالحة.',
      cycles,
    };
  }

  const baselineMae=mean(cycles.map(item=>item.baselineErrorPercent))??0;
  const candidateMae=mean(cycles.map(item=>item.candidateErrorPercent))??0;
  const improvement=baselineMae>0?((baselineMae-candidateMae)/baselineMae)*100:0;
  const worstDegradation=Math.max(...cycles.map(item=>item.candidateErrorPercent-item.baselineErrorPercent),0);
  const passed=candidateMae<baselineMae&&improvement>=5&&worstDegradation<=15;

  return {
    status:passed?'PASSED':'FAILED',
    sampleSize:cycles.length,
    baselineMaePercent:baselineMae,
    candidateMaePercent:candidateMae,
    improvementPercent:improvement,
    worstCycleDegradationPercent:worstDegradation,
    passed,
    reason:passed
      ?'المعايرة حسنت متوسط الخطأ تاريخيًا دون تدهور مفرط في دورة منفردة.'
      :'لم تحقق المعايرة تحسنًا تاريخيًا كافيًا وآمنًا؛ تبقى مقترحًا غير مؤهل للاعتماد.',
    cycles,
  };
}
