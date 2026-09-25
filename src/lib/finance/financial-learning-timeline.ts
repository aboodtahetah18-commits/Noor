import {
  syncFinancialLearningLifecycle,
  type FinancialLearningLifecycleEvent,
  type FinancialLearningLifecycleItem,
  type FinancialLearningLifecycleStore,
} from '@/lib/finance/financial-learning-lifecycle';
import { monitorActiveFinancialLearning } from '@/lib/finance/financial-learning-monitor';

export type FinancialLearningTimelinePhase=
  |'LEARNED'
  |'BACKTEST'
  |'REVIEW'
  |'APPROVAL'
  |'ACTIVATION'
  |'MONITORING'
  |'REJECTION'
  |'ROLLBACK';

export type FinancialLearningTimelineEntry={
  id:string;
  algorithmKey:string;
  algorithmName:string;
  kind:FinancialLearningLifecycleItem['kind'];
  parameterKey:string;
  ownerBank:FinancialLearningLifecycleItem['ownerBank'];
  at:string;
  phase:FinancialLearningTimelinePhase;
  action:string;
  title:string;
  learnedWhat:string;
  why:string;
  sourceCycleIds:string[];
  evidence:string[];
  confidence:number;
  proposedValue:number;
  previousValue:number|null;
  resultingValue:number|null;
  baselineErrorPercent:number|null;
  candidateErrorPercent:number|null;
  improvementPercent:number|null;
  monitoringState:'INSUFFICIENT_DATA'|'STABLE'|'IMPROVED'|'ROLLBACK_REVIEW_REQUIRED'|null;
  outcome:'PENDING'|'PASSED'|'APPROVED'|'ACTIVE'|'IMPROVED'|'STABLE'|'REJECTED'|'ROLLED_BACK'|'REVIEW_REQUIRED';
};

export type FinancialLearningTimelineAlgorithm={
  algorithmKey:string;
  algorithmName:string;
  kind:FinancialLearningLifecycleItem['kind'];
  parameterKey:string;
  currentStatus:FinancialLearningLifecycleItem['status'];
  learnedWhat:string;
  sourceCycleIds:string[];
  confidence:number;
  proposedValue:number;
  currentOutcome:FinancialLearningTimelineEntry['outcome'];
  entries:FinancialLearningTimelineEntry[];
};

export type FinancialLearningTimeline={
  generatedAt:string;
  algorithms:FinancialLearningTimelineAlgorithm[];
  entries:FinancialLearningTimelineEntry[];
  summary:{
    algorithmsLearned:number;
    active:number;
    improved:number;
    rollbackReviewRequired:number;
    rolledBack:number;
    rejected:number;
  };
};

const ALGORITHM_NAMES:Record<FinancialLearningLifecycleItem['kind'],string>={
  EXPENSE_BASELINE:'خوارزمية خط أساس المصروفات',
  SAVING_EXPECTATION:'خوارزمية توقع الادخار',
  INCOME_REALIZATION:'خوارزمية تحقق الدخل المتوقع',
  FORECAST_CALIBRATION:'خوارزمية معايرة توقع نهاية الدورة',
};

function phaseForAction(action:FinancialLearningLifecycleEvent['action']):FinancialLearningTimelinePhase{
  if(action==='SUBMIT_REVIEW')return 'REVIEW';
  if(action==='APPROVE')return 'APPROVAL';
  if(action==='REJECT')return 'REJECTION';
  if(action==='ACTIVATE')return 'ACTIVATION';
  if(action==='ROLLBACK')return 'ROLLBACK';
  return 'BACKTEST';
}

function outcomeForItem(item:FinancialLearningLifecycleItem):FinancialLearningTimelineEntry['outcome']{
  if(item.status==='REJECTED')return 'REJECTED';
  if(item.status==='ROLLED_BACK')return 'ROLLED_BACK';
  if(item.monitoring?.state==='ROLLBACK_REVIEW_REQUIRED')return 'REVIEW_REQUIRED';
  if(item.monitoring?.state==='IMPROVED')return 'IMPROVED';
  if(item.monitoring?.state==='STABLE')return 'STABLE';
  if(item.status==='ACTIVE')return 'ACTIVE';
  if(item.status==='APPROVED')return 'APPROVED';
  if(item.status==='BACKTEST_PASSED'||item.status==='IN_REVIEW')return 'PASSED';
  return 'PENDING';
}

function actionTitle(event:FinancialLearningLifecycleEvent){
  if(event.action==='SYNC')return 'تسجيل نتيجة التعلم';
  if(event.action==='SUBMIT_REVIEW')return 'إحالة للمراجعة';
  if(event.action==='APPROVE')return 'اعتماد المعايرة';
  if(event.action==='REJECT')return 'رفض المعايرة';
  if(event.action==='ACTIVATE')return 'تفعيل المعايرة';
  if(event.action==='ROLLBACK')return 'التراجع عن المعايرة';
  return event.action;
}

function eventEntry(item:FinancialLearningLifecycleItem,event:FinancialLearningLifecycleEvent,index:number):FinancialLearningTimelineEntry{
  const outcome=event.action==='REJECT'
    ?'REJECTED'
    :event.action==='ROLLBACK'
      ?'ROLLED_BACK'
      :event.action==='ACTIVATE'
        ?'ACTIVE'
        :event.action==='APPROVE'
          ?'APPROVED'
          :event.action==='SUBMIT_REVIEW'||event.action==='SYNC'
            ?'PASSED'
            :outcomeForItem(item);
  return {
    id:item.key+':event:'+String(index)+':'+event.at,
    algorithmKey:item.key,
    algorithmName:ALGORITHM_NAMES[item.kind],
    kind:item.kind,
    parameterKey:item.parameterKey,
    ownerBank:item.ownerBank,
    at:event.at,
    phase:phaseForAction(event.action),
    action:event.action,
    title:actionTitle(event),
    learnedWhat:item.learningSummary??item.title,
    why:event.note??item.learningSummary??item.title,
    sourceCycleIds:item.sourceCycleIds??[],
    evidence:item.learningEvidence??[],
    confidence:item.confidence,
    proposedValue:item.proposedValue,
    previousValue:item.previousActiveValue,
    resultingValue:event.action==='ROLLBACK'
      ?item.previousActiveValue
      :['APPROVE','ACTIVATE'].includes(event.action)?item.proposedValue:null,
    baselineErrorPercent:item.baselineErrorPercent,
    candidateErrorPercent:item.candidateErrorPercent,
    improvementPercent:item.improvementPercent,
    monitoringState:item.monitoring?.state??null,
    outcome,
  };
}

function monitoringEntry(item:FinancialLearningLifecycleItem):FinancialLearningTimelineEntry|null{
  const monitoring=item.monitoring;
  if(!monitoring)return null;
  const outcome=monitoring.state==='ROLLBACK_REVIEW_REQUIRED'
    ?'REVIEW_REQUIRED'
    :monitoring.state==='IMPROVED'
      ?'IMPROVED'
      :monitoring.state==='STABLE'
        ?'STABLE'
        :'PENDING';
  return {
    id:item.key+':monitoring:'+monitoring.evaluatedAt,
    algorithmKey:item.key,
    algorithmName:ALGORITHM_NAMES[item.kind],
    kind:item.kind,
    parameterKey:item.parameterKey,
    ownerBank:item.ownerBank,
    at:monitoring.evaluatedAt,
    phase:'MONITORING',
    action:'POST_ACTIVATION_EVALUATION',
    title:'تقييم الأداء بعد التفعيل',
    learnedWhat:item.learningSummary??item.title,
    why:monitoring.reason,
    sourceCycleIds:item.sourceCycleIds??[],
    evidence:item.learningEvidence??[],
    confidence:item.confidence,
    proposedValue:item.proposedValue,
    previousValue:item.previousActiveValue,
    resultingValue:item.status==='ACTIVE'?item.proposedValue:item.previousActiveValue,
    baselineErrorPercent:monitoring.baselineMaePercent,
    candidateErrorPercent:monitoring.activeMaePercent,
    improvementPercent:monitoring.changePercent,
    monitoringState:monitoring.state,
    outcome,
  };
}

export function buildFinancialLearningTimeline(store:FinancialLearningLifecycleStore):FinancialLearningTimeline{
  const algorithms=Object.values(store.items).map(item=>{
    const entries=item.history.map((event,index)=>eventEntry(item,event,index));
    const monitoring=monitoringEntry(item);
    if(monitoring)entries.push(monitoring);
    entries.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
    return {
      algorithmKey:item.key,
      algorithmName:ALGORITHM_NAMES[item.kind],
      kind:item.kind,
      parameterKey:item.parameterKey,
      currentStatus:item.status,
      learnedWhat:item.learningSummary??item.title,
      sourceCycleIds:item.sourceCycleIds??[],
      confidence:item.confidence,
      proposedValue:item.proposedValue,
      currentOutcome:outcomeForItem(item),
      entries,
    };
  }).sort((a,b)=>{
    const aAt=a.entries[0]?.at??'';
    const bAt=b.entries[0]?.at??'';
    return Date.parse(bAt)-Date.parse(aAt);
  });

  const entries=algorithms.flatMap(item=>item.entries)
    .sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));

  return {
    generatedAt:new Date().toISOString(),
    algorithms,
    entries,
    summary:{
      algorithmsLearned:algorithms.length,
      active:algorithms.filter(item=>item.currentStatus==='ACTIVE').length,
      improved:algorithms.filter(item=>item.currentOutcome==='IMPROVED').length,
      rollbackReviewRequired:algorithms.filter(item=>item.currentOutcome==='REVIEW_REQUIRED').length,
      rolledBack:algorithms.filter(item=>item.currentStatus==='ROLLED_BACK').length,
      rejected:algorithms.filter(item=>item.currentStatus==='REJECTED').length,
    },
  };
}

export async function getFinancialLearningTimeline(userId:string){
  await syncFinancialLearningLifecycle(userId);
  const monitoring=await monitorActiveFinancialLearning(userId);
  return buildFinancialLearningTimeline(monitoring.store);
}
