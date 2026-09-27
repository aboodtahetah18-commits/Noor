import { rawSql } from '@/infrastructure/db/client';
import { PILOT_2026 } from '@/config/pilot-2026';
import { refreshFinancialContinuousLearning } from '@/lib/finance/financial-continuous-learning-engine';
import { monitorActiveFinancialLearning } from '@/lib/finance/financial-learning-monitor';
import { getFinancialLearningTimeline } from '@/lib/finance/financial-learning-timeline';
import { getPilotAlgorithmReviewQueue } from '@/features/pilot/queries/get-pilot-algorithm-review-queue';

const FACT_KEY='algorithm_daily_knowledge_report';
const HISTORY_LIMIT=30;

export type AlgorithmKnowledgeSeverity='INFO'|'WATCH'|'REVIEW_REQUIRED';
export type AlgorithmKnowledgeFinding={key:string;severity:AlgorithmKnowledgeSeverity;title:string;detail:string;source:string;evidenceCount:number;nextStep:string};
export type DailyAlgorithmKnowledgeReport={version:1;reportDate:string;generatedAt:string;summary:{totalFindings:number;reviewRequired:number;watch:number;information:number;sourcesUnavailable:number};findings:AlgorithmKnowledgeFinding[];safeguards:{autoApply:false;requiresReview:true;hardRulesMutable:false}};
type StoredReport={version:1;latest:DailyAlgorithmKnowledgeReport;history:DailyAlgorithmKnowledgeReport[]};

function severityRank(value:AlgorithmKnowledgeSeverity){if(value==='REVIEW_REQUIRED')return 3;if(value==='WATCH')return 2;return 1}
function sourceFailure(key:string,title:string):AlgorithmKnowledgeFinding{return {key:'source-unavailable-'+key,severity:'WATCH',title:'مصدر تعلم لم يكتمل تحليله',detail:'تعذر تحليل '+title+' في هذه الدورة اليومية. سُجلت الحالة بدل تجاهلها حتى يمكن مراجعة سبب التعذر.',source:title,evidenceCount:0,nextStep:'راجع توفر المصدر وسلامة البيانات قبل الاعتماد على أي استنتاج مرتبط به.'}}

export async function buildDailyAlgorithmKnowledgeReport(userId:string,now:Date=new Date()):Promise<DailyAlgorithmKnowledgeReport>{
  const [continuous,monitor,timeline,pilot]=await Promise.allSettled([
    refreshFinancialContinuousLearning(userId),
    monitorActiveFinancialLearning(userId),
    getFinancialLearningTimeline(userId),
    getPilotAlgorithmReviewQueue(userId,PILOT_2026.startsAt,PILOT_2026.endsAt),
  ]);
  const findings:AlgorithmKnowledgeFinding[]=[];
  if(continuous.status==='fulfilled'){
    for(const proposal of continuous.value.proposals){
      const failed=proposal.backtest.status==='FAILED';const passed=proposal.backtest.status==='PASSED';
      findings.push({key:'continuous-'+proposal.key,severity:failed?'REVIEW_REQUIRED':passed?'INFO':'WATCH',title:proposal.title,detail:proposal.summary+' الثقة الحالية '+proposal.confidence+'٪، وحالة الاختبار الرجعي '+(failed?'لم تنجح':passed?'نجحت':'تحتاج مراجعة نوعية')+'.',source:'التعلم المالي المستمر',evidenceCount:proposal.evidence.length,nextStep:failed?'لا تغيّر المعايرة. افحص سبب فشل الاختبار الرجعي وأعد صياغة الفرضية.':passed?'حوّلها إلى مرشح تحسين حوكمي للمراجعة، دون تطبيق تلقائي.':'اجمع أدلة إضافية وحدد سبب عدم حسم الاختبار قبل اقتراح تغيير.'});
    }
  }else findings.push(sourceFailure('continuous','التعلم المالي المستمر'));
  if(monitor.status==='fulfilled'){
    for(const item of monitor.value.rollbackReviewRequired)findings.push({key:'monitor-'+item.key,severity:'REVIEW_REQUIRED',title:'أداء بعد التفعيل يحتاج مراجعة',detail:item.monitoring?.reason??'أظهر القياس بعد التفعيل تراجعًا يستدعي المراجعة.',source:'مراقبة ما بعد التفعيل',evidenceCount:item.monitoring?.sampleSize??0,nextStep:'جمّد أي توسيع للتغيير الحالي، وراجع التراجع ثم اختبر خيار التعديل أو الرجوع.'});
  }else findings.push(sourceFailure('monitor','مراقبة ما بعد التفعيل'));
  if(pilot.status==='fulfilled'){
    for(const item of pilot.value)findings.push({key:'pilot-'+item.id,severity:item.severity==='REVIEW_REQUIRED'?'REVIEW_REQUIRED':'WATCH',title:item.title,detail:item.rationale,source:'جودة التوصيات',evidenceCount:item.evidenceCount,nextStep:item.proposedAction});
  }else findings.push(sourceFailure('pilot','جودة التوصيات'));
  if(timeline.status==='fulfilled'){
    for(const algorithm of timeline.value.algorithms){if(!['REVIEW_REQUIRED','ROLLED_BACK','REJECTED'].includes(algorithm.currentOutcome))continue;findings.push({key:'timeline-'+algorithm.algorithmKey,severity:algorithm.currentOutcome==='REVIEW_REQUIRED'?'REVIEW_REQUIRED':'WATCH',title:algorithm.algorithmName,detail:'الحالة الحالية: '+algorithm.currentOutcome+' — '+algorithm.learnedWhat,source:'ذاكرة تعلم الخوارزميات',evidenceCount:algorithm.entries.length,nextStep:algorithm.currentOutcome==='REVIEW_REQUIRED'?'راجع التسلسل الزمني والأدلة قبل اعتماد أي إصدار جديد.':'استخلص سبب الرفض أو التراجع وحوّله إلى قيد واضح في التجربة التالية.'})}
  }else findings.push(sourceFailure('timeline','ذاكرة تعلم الخوارزميات'));
  if(findings.length===0)findings.push({key:'no-confirmed-issues',severity:'INFO',title:'لا توجد إشكالية خوارزمية مؤكدة اليوم',detail:'لم تظهر من المصادر الحالية إشارة متكررة تكفي لفتح مراجعة أو اقتراح تغيير.',source:'التقرير اليومي',evidenceCount:0,nextStep:'استمر في القياس وجمع الأدلة دون تعديل القواعد.'});
  findings.sort((a,b)=>severityRank(b.severity)-severityRank(a.severity)||b.evidenceCount-a.evidenceCount);
  return {version:1,reportDate:now.toISOString().slice(0,10),generatedAt:now.toISOString(),summary:{totalFindings:findings.length,reviewRequired:findings.filter(x=>x.severity==='REVIEW_REQUIRED').length,watch:findings.filter(x=>x.severity==='WATCH').length,information:findings.filter(x=>x.severity==='INFO').length,sourcesUnavailable:findings.filter(x=>x.key.startsWith('source-unavailable-')).length},findings,safeguards:{autoApply:false,requiresReview:true,hardRulesMutable:false}};
}

export async function saveDailyAlgorithmKnowledgeReport(userId:string,report:DailyAlgorithmKnowledgeReport){
  const current=await rawSql`select value_json from public.user_foundation_facts where user_id=${userId}::uuid and fact_key=${FACT_KEY} and status='ACTIVE' limit 1`;
  const value=current[0]?.value_json as Partial<StoredReport>|undefined;
  const previous=Array.isArray(value?.history)?value?.history??[]:[];
  const deduped=previous.filter(item=>item?.reportDate!==report.reportDate);
  const payload:StoredReport={version:1,latest:report,history:[report,...deduped].slice(0,HISTORY_LIMIT)};
  await rawSql`insert into public.user_foundation_facts(user_id,fact_key,category,value_json,source,confidence,verified_at,uses,requires_confirmation,status) values(${userId}::uuid,${FACT_KEY},'learning',${JSON.stringify(payload)}::jsonb,'SYSTEM_DERIVED',1,now(),ARRAY['algorithm_learning','governance_review','daily_knowledge_report'],false,'ACTIVE') on conflict(user_id,fact_key) do update set value_json=excluded.value_json,source=excluded.source,confidence=excluded.confidence,verified_at=excluded.verified_at,uses=excluded.uses,requires_confirmation=false,status='ACTIVE',updated_at=now()`;
  return payload;
}

export async function generateAndStoreDailyAlgorithmKnowledgeReport(userId:string,now:Date=new Date()){const report=await buildDailyAlgorithmKnowledgeReport(userId,now);await saveDailyAlgorithmKnowledgeReport(userId,report);return report}
export async function readDailyAlgorithmKnowledgeReport(userId:string):Promise<StoredReport|null>{const rows=await rawSql`select value_json from public.user_foundation_facts where user_id=${userId}::uuid and fact_key=${FACT_KEY} and status='ACTIVE' limit 1`;const value=rows[0]?.value_json;return value&&typeof value==='object'&&!Array.isArray(value)?value as StoredReport:null}
export async function runDailyAlgorithmKnowledgeReportJob(now:Date=new Date()){
  const users=await rawSql`select distinct user_id::text from (select user_id from public.financial_cycles union select user_id from public.user_foundation_facts where status='ACTIVE') active_users order by user_id`;
  const results:{userId:string;status:'SUCCESS'|'FAILED';reportDate?:string;findings?:number;error?:string}[]=[];
  for(const row of users){const userId=String(row.user_id);try{const report=await generateAndStoreDailyAlgorithmKnowledgeReport(userId,now);results.push({userId,status:'SUCCESS',reportDate:report.reportDate,findings:report.summary.totalFindings})}catch(error){results.push({userId,status:'FAILED',error:error instanceof Error?error.message.slice(0,120):'DAILY_ALGORITHM_REPORT_FAILED'})}}
  return results;
}
