import { getFinancialLearningTimeline, type FinancialLearningTimelineAlgorithm } from '@/lib/finance/financial-learning-timeline';

export type FinancialDecisionLearningDomain=
  |'budget_spending'
  |'liquidity_protection'
  |'goals'
  |'obligations'
  |'investment'
  |'forecast';

export type FinancialDecisionLearningContext={
  domain:FinancialDecisionLearningDomain;
  algorithmKey:string;
  algorithmName:string;
  kind:FinancialLearningTimelineAlgorithm['kind'];
  outcome:FinancialLearningTimelineAlgorithm['currentOutcome'];
  learnedWhat:string;
  sourceCycleIds:string[];
  confidence:number;
  proposedValue:number;
  lastEventAt:string|null;
  decisionUse:'SUPPORT'|'CAUTION'|'HISTORICAL_ONLY';
  shortText:string;
};

const DOMAIN_KINDS:Record<FinancialDecisionLearningDomain,readonly FinancialLearningTimelineAlgorithm['kind'][]>={
  budget_spending:['EXPENSE_BASELINE'],
  liquidity_protection:['INCOME_REALIZATION','SAVING_EXPECTATION'],
  goals:['SAVING_EXPECTATION'],
  obligations:['INCOME_REALIZATION'],
  investment:['SAVING_EXPECTATION','INCOME_REALIZATION'],
  forecast:['FORECAST_CALIBRATION','INCOME_REALIZATION','EXPENSE_BASELINE'],
};

function outcomePriority(outcome:FinancialLearningTimelineAlgorithm['currentOutcome']){
  if(outcome==='REVIEW_REQUIRED')return 100;
  if(outcome==='IMPROVED')return 90;
  if(outcome==='ROLLED_BACK')return 80;
  if(outcome==='REJECTED')return 70;
  if(outcome==='STABLE')return 60;
  if(outcome==='ACTIVE')return 50;
  if(outcome==='APPROVED')return 40;
  if(outcome==='PASSED')return 30;
  return 0;
}

function decisionUse(outcome:FinancialLearningTimelineAlgorithm['currentOutcome']):FinancialDecisionLearningContext['decisionUse']{
  if(outcome==='IMPROVED'||outcome==='STABLE')return 'SUPPORT';
  if(outcome==='REVIEW_REQUIRED'||outcome==='ROLLED_BACK'||outcome==='REJECTED')return 'CAUTION';
  return 'HISTORICAL_ONLY';
}

function textForAlgorithm(algorithm:FinancialLearningTimelineAlgorithm){
  const cycles=algorithm.sourceCycleIds.length;
  if(algorithm.currentOutcome==='IMPROVED'){
    return 'سجل التعلم يدعم هذه القراءة: '+algorithm.learnedWhat+'، وظهر تحسن فعلي بعد التفعيل عبر '+cycles+' دورات مرجعية.';
  }
  if(algorithm.currentOutcome==='STABLE'){
    return 'سجل التعلم يشير إلى نمط مستقر: '+algorithm.learnedWhat+'، دون تدهور جوهري بعد التفعيل.';
  }
  if(algorithm.currentOutcome==='REVIEW_REQUIRED'){
    return 'تنبيه من سجل التعلم: المعايرة المرتبطة بهذه النقطة تحت مراجعة تراجع، لذلك لن أعتمد عليها وحدها في القرار.';
  }
  if(algorithm.currentOutcome==='ROLLED_BACK'){
    return 'سبق أن جُرّبت معايرة مرتبطة بهذه النقطة ثم تم التراجع عنها؛ سأتعامل معها كسابقة تحذيرية لا كقاعدة قرار.';
  }
  if(algorithm.currentOutcome==='REJECTED'){
    return 'سبق رفض معايرة مرتبطة بهذا النمط؛ سأحتفظ بها كسياق تاريخي ولن أستخدمها كمرجع حاكم.';
  }
  if(algorithm.currentOutcome==='ACTIVE'){
    return 'توجد معايرة نشطة مرتبطة بهذه النقطة لكنها ما زالت تحت المراقبة؛ سأستخدمها كتوقع مساعد فقط.';
  }
  if(algorithm.currentOutcome==='APPROVED'||algorithm.currentOutcome==='PASSED'){
    return 'يوجد تعلم سابق مرتبط بهذه النقطة اجتاز المراجعة الأولية لكنه لم يثبت أثره الفعلي بعد.';
  }
  return 'يوجد سجل تعلم سابق مرتبط بهذه النقطة، لكنه غير مؤهل حاليًا للتأثير على القرار.';
}

export function buildFinancialDecisionLearningContextFromTimeline(
  timeline:Awaited<ReturnType<typeof getFinancialLearningTimeline>>,
  domain:FinancialDecisionLearningDomain,
):FinancialDecisionLearningContext|null{
  const allowed=new Set(DOMAIN_KINDS[domain]);
  const algorithm=timeline.algorithms
    .filter(item=>allowed.has(item.kind))
    .sort((a,b)=>{
      const priority=outcomePriority(b.currentOutcome)-outcomePriority(a.currentOutcome);
      if(priority!==0)return priority;
      return b.confidence-a.confidence;
    })[0]??null;
  if(!algorithm)return null;

  return {
    domain,
    algorithmKey:algorithm.algorithmKey,
    algorithmName:algorithm.algorithmName,
    kind:algorithm.kind,
    outcome:algorithm.currentOutcome,
    learnedWhat:algorithm.learnedWhat,
    sourceCycleIds:algorithm.sourceCycleIds,
    confidence:algorithm.confidence,
    proposedValue:algorithm.proposedValue,
    lastEventAt:algorithm.entries[0]?.at??null,
    decisionUse:decisionUse(algorithm.currentOutcome),
    shortText:textForAlgorithm(algorithm),
  };
}

export async function getFinancialDecisionLearningContext(
  userId:string,
  domain:FinancialDecisionLearningDomain,
){
  const timeline=await getFinancialLearningTimeline(userId);
  return buildFinancialDecisionLearningContextFromTimeline(timeline,domain);
}

export function financialLearningDomainForRole(roleKey:string):FinancialDecisionLearningDomain|null{
  if(roleKey==='budget-spending-owner')return 'budget_spending';
  if(roleKey==='liquidity-protection-owner')return 'liquidity_protection';
  if(roleKey==='goals-owner')return 'goals';
  if(roleKey==='obligations-owner')return 'obligations';
  if(roleKey==='investment-owner')return 'investment';
  return null;
}
