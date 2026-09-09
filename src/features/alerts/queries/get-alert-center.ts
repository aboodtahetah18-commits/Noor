import { rawSql } from '@/infrastructure/db/client';
import { getDailyBankOperationsCenter } from '@/features/bank-operations/queries/get-daily-bank-operations-center';
import { getGoalCycleReadiness } from '@/features/goals/queries/get-goal-cycle-readiness';
import { listActiveFundingCases } from '@/features/internal-funding/queries/list-active-funding-cases';
import { getCycleMonthlyReview } from '@/features/cycles/queries/get-cycle-monthly-review';
import { Money } from '@/financial-engine/money';

export type AlertSeverity='CRITICAL'|'WARNING'|'INFO';
export type AlertItem={key:string;kind:string;title:string;detail:string;href:string;count:number;severity:AlertSeverity;sourceId:string|null;status:'NEW'|'SEEN'|'IN_PROGRESS'|'SNOOZED'};

export async function getAlertCenter(userId:string,cycleId?:string|null){
  const [bank,goals,funding,overdueRows]=await Promise.all([
    getDailyBankOperationsCenter(userId),getGoalCycleReadiness(userId),listActiveFundingCases(userId),
    rawSql`select o.id,o.amount::text,t.name from public.obligation_occurrences o join public.obligation_templates t on t.id=o.template_id and t.user_id=o.user_id where o.user_id=${userId} and o.status='OVERDUE' order by o.due_date`
  ]);
  const review=cycleId?await getCycleMonthlyReview(userId,cycleId):null;
  const items:AlertItem[]=[];
  for(const r of overdueRows) items.push({key:`obligation:${String(r.id)}`,kind:'OVERDUE_OBLIGATION',title:`التزام متأخر: ${String(r.name)}`,detail:`القيمة ${String(r.amount)} ر.س وما زال محجوزًا حتى المعالجة.`,href:'/obligations',count:1,severity:'CRITICAL',sourceId:String(r.id),status:'NEW'});
  if(bank.duplicateCandidatesCount>0)items.push({key:'bank:duplicates',kind:'BANK_DUPLICATES',title:'عمليات بنكية مكررة محتملة',detail:`${bank.duplicateCandidatesCount} حالة متوقفة حتى مراجعتك.`,href:'/bank-operations',count:bank.duplicateCandidatesCount,severity:'WARNING',sourceId:null,status:'NEW'});
  const nonDup=Math.max(0,bank.pendingReviewCount-bank.duplicateCandidatesCount);if(nonDup>0)items.push({key:'bank:pending',kind:'BANK_PENDING',title:'عمليات بنكية تحتاج قرارك',detail:`${nonDup} عملية لم تُحسم بعد.`,href:'/bank-operations',count:nonDup,severity:'WARNING',sourceId:null,status:'NEW'});
  const deviations=review?.categories.filter(c=>c.needsExplanation)??[];if(deviations.length>0)items.push({key:`cycle:${cycleId}:deviations`,kind:'CATEGORY_EXPLANATION',title:'بنود انحرفت 10% أو أكثر',detail:`${deviations.length} بند يحتاج تفسير السبب قبل استخدامه في التعلم القادم.`,href:`/cycles/${cycleId}/review`,count:deviations.length,severity:'WARNING',sourceId:cycleId??null,status:'NEW'});
  const gaps=goals.items.filter(g=>g.gapThisCycle!==null&&Money.parse(g.gapThisCycle).isPositive());if(gaps.length>0)items.push({key:`goals:${cycleId??'current'}:gaps`,kind:'GOAL_GAP',title:'أهداف لديها فجوة تمويل',detail:`${gaps.length} هدف لم يصل إلى مساهمته المطلوبة لهذه الدورة.`,href:'/goals',count:gaps.length,severity:'WARNING',sourceId:null,status:'NEW'});
  for(const f of funding.filter(x=>x.status==='RECOVERY'))items.push({key:`funding:${f.id}:recovery`,kind:'FUNDING_RECOVERY',title:`استرداد تمويل داخلي: ${f.title}`,detail:'هذا التمويل في مرحلة الاسترداد ويحتاج متابعة الخطة المعتمدة.',href:'/internal-funding',count:1,severity:'INFO',sourceId:f.id,status:'NEW'});
  if(items.length===0)return{items:[],visible:[],snoozed:[],counts:{critical:0,warning:0,info:0}};
  const states=await rawSql`select alert_key,status,snoozed_until::text from public.alert_lifecycle_states where user_id=${userId} and alert_key=any(${items.map(i=>i.key)}::text[])`;
  const map=new Map(states.map(r=>[String(r.alert_key),r]));const now=Date.now();
  const merged=items.map(i=>{const s=map.get(i.key);if(!s)return i;const expired=s.status==='SNOOZED'&&(!s.snoozed_until||new Date(String(s.snoozed_until)).getTime()<=now);return{...i,status:(expired?'NEW':String(s.status)) as AlertItem['status']};});
  const visible=merged.filter(i=>i.status!=='SNOOZED'),snoozed=merged.filter(i=>i.status==='SNOOZED');
  return{items:merged,visible,snoozed,counts:{critical:visible.filter(i=>i.severity==='CRITICAL').length,warning:visible.filter(i=>i.severity==='WARNING').length,info:visible.filter(i=>i.severity==='INFO').length}};
}
