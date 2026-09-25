export type FinancialLearningPostActivationKind=
  |'EXPENSE_BASELINE'
  |'SAVING_EXPECTATION'
  |'INCOME_REALIZATION';

export type FinancialLearningPostActivationRow={
  cycleId:string;
  plannedExpense:number;
  actualExpense:number;
  plannedSaving:number;
  actualSaving:number;
  expectedIncome:number;
  actualIncome:number;
};

export type FinancialLearningPostActivationEvaluation={
  sampleSize:number;
  baselineMaePercent:number|null;
  activeMaePercent:number|null;
  changePercent:number|null;
  state:'INSUFFICIENT_DATA'|'STABLE'|'IMPROVED'|'ROLLBACK_REVIEW_REQUIRED';
  reason:string;
};

function mean(values:number[]){
  return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
}

function errorPercent(prediction:number,actual:number){
  return Math.abs(prediction-actual)/Math.max(1,Math.abs(actual))*100;
}

function valuesForKind(row:FinancialLearningPostActivationRow,kind:FinancialLearningPostActivationKind){
  if(kind==='EXPENSE_BASELINE')return {baseline:row.plannedExpense,actual:row.actualExpense};
  if(kind==='SAVING_EXPECTATION')return {baseline:row.plannedSaving,actual:row.actualSaving};
  return {baseline:row.expectedIncome,actual:row.actualIncome};
}

export function evaluateFinancialLearningPostActivation(args:{
  rows:FinancialLearningPostActivationRow[];
  kind:FinancialLearningPostActivationKind;
  activeFactor:number;
  minimumSampleSize?:number;
  rollbackReviewThresholdPercent?:number;
}):FinancialLearningPostActivationEvaluation{
  const minimumSampleSize=args.minimumSampleSize??2;
  const rollbackReviewThresholdPercent=args.rollbackReviewThresholdPercent??10;
  const usable=args.rows
    .map(row=>({row,values:valuesForKind(row,args.kind)}))
    .filter(item=>item.values.baseline>0);

  if(usable.length<minimumSampleSize){
    return {
      sampleSize:usable.length,
      baselineMaePercent:null,
      activeMaePercent:null,
      changePercent:null,
      state:'INSUFFICIENT_DATA',
      reason:'نحتاج إلى دورتين مغلقتين على الأقل بعد التفعيل قبل الحكم على المعايرة.',
    };
  }

  const baselineMae=mean(usable.map(item=>errorPercent(item.values.baseline,item.values.actual)))??0;
  const activeMae=mean(usable.map(item=>errorPercent(item.values.baseline*args.activeFactor,item.values.actual)))??0;
  const change=baselineMae>0?((baselineMae-activeMae)/baselineMae)*100:(activeMae===0?0:-100);

  if(activeMae>baselineMae&&change<=-rollbackReviewThresholdPercent){
    return {
      sampleSize:usable.length,
      baselineMaePercent:baselineMae,
      activeMaePercent:activeMae,
      changePercent:change,
      state:'ROLLBACK_REVIEW_REQUIRED',
      reason:'المعايرة النشطة رفعت متوسط الخطأ مقارنة بالخط الأساسي بما يتجاوز حد المراجعة.',
    };
  }

  if(activeMae<baselineMae){
    return {
      sampleSize:usable.length,
      baselineMaePercent:baselineMae,
      activeMaePercent:activeMae,
      changePercent:change,
      state:'IMPROVED',
      reason:'المعايرة النشطة حسنت متوسط الخطأ في الدورات الجديدة.',
    };
  }

  return {
    sampleSize:usable.length,
    baselineMaePercent:baselineMae,
    activeMaePercent:activeMae,
    changePercent:change,
    state:'STABLE',
    reason:'لم يظهر تدهور جوهري يستدعي مراجعة التراجع.',
  };
}
