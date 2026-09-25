import { getRawSql } from '@/infrastructure/db/client';
import { listBankDecisions } from '@/features/bank-decisions/queries/list-bank-decisions';
import { getFinancialLearningTimeline } from '@/lib/finance/financial-learning-timeline';
import { syncDecisionOutcomeRegistry, type DecisionOutcomeRecord } from '@/lib/finance/decision-outcome-registry';

export type UnifiedDecisionSource='BANK_OPERATION'|'CONVERSATION'|'COMMITTEE'|'LEARNING';
export type UnifiedDecisionActorType='USER'|'SYSTEM'|'ROLE'|'COMMITTEE';

export type UnifiedDecisionLogItem={
  id:string;
  source:UnifiedDecisionSource;
  sourceRef:string|null;
  actor:{
    key:string;
    name:string;
    type:UnifiedDecisionActorType;
  };
  decision:{
    title:string;
    action:string;
    status:string|null;
  };
  current:{
    label:string|null;
    value:string|null;
    secondary:string[];
  };
  rule:{
    code:string|null;
    title:string|null;
  };
  memory:{
    summary:string|null;
    at:string|null;
  };
  learning:{
    algorithmName:string|null;
    outcome:string|null;
    decisionUse:string|null;
    confidence:number|null;
    sourceCycleIds:string[];
  };
  confidence:number|null;
  why:string|null;
  outcome:DecisionOutcomeRecord|null;
  externalExecution:boolean;
  createdAt:string;
  rawImpact:unknown;
};

function asRecord(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

function text(value:unknown){
  return typeof value==='string'&&value.trim()?value.trim():null;
}

function numberValue(value:unknown){
  const parsed=typeof value==='number'?value:Number(value);
  return Number.isFinite(parsed)?parsed:null;
}

function stringArray(value:unknown){
  return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];
}

function legacyBankDecisionTitle(eventType:string){
  const labels:Record<string,string>={
    ROW_CONFIRM:'اعتماد عملية',
    BATCH_MERCHANT_APPLY:'تعميم تعريف تاجر',
    AUTO_POST:'اعتماد تلقائي منضبط',
    MERCHANT_RULE_UPDATE:'تحديث قاعدة تاجر',
    MERCHANT_ALIAS_ADD:'إضافة اسم بديل',
    MERCHANT_ALIAS_TOGGLE:'تغيير حالة اسم بديل',
    IMPORT_APPROVE:'اعتماد دفعة بنكية',
  };
  return labels[eventType]??eventType;
}

export function mapBankDecisionToUnified(row:Awaited<ReturnType<typeof listBankDecisions>>[number]):UnifiedDecisionLogItem{
  const subject=row.merchantName??row.rowDescription??row.importName??'قرار بنكي';
  return {
    id:'bank:'+row.id,
    source:'BANK_OPERATION',
    sourceRef:row.id,
    actor:{
      key:row.sourceType==='SYSTEM'?'bank-operations-system':'user',
      name:row.sourceType==='SYSTEM'?'النظام':'المستخدم',
      type:row.sourceType==='SYSTEM'?'SYSTEM':'USER',
    },
    decision:{
      title:subject,
      action:legacyBankDecisionTitle(row.eventType),
      status:null,
    },
    current:{
      label:row.affectedAmount!==null?'الأثر المالي':'عدد العمليات',
      value:row.affectedAmount??String(row.affectedCount),
      secondary:['العمليات المتأثرة: '+String(row.affectedCount)],
    },
    rule:{
      code:'BANK-EVENT-'+row.eventType,
      title:legacyBankDecisionTitle(row.eventType),
    },
    memory:{summary:null,at:null},
    learning:{algorithmName:null,outcome:null,decisionUse:null,confidence:null,sourceCycleIds:[]},
    confidence:null,
    why:row.reason,
    outcome:null,
    externalExecution:true,
    createdAt:row.createdAt,
    rawImpact:row.impactSummary,
  };
}

export function mapConversationDecisionToUnified(row:{
  id:unknown;
  sender_key:unknown;
  sender_name:unknown;
  sender_type:unknown;
  message_kind:unknown;
  body:unknown;
  structured_data:unknown;
  created_at:unknown;
}):UnifiedDecisionLogItem|null{
  const data=asRecord(row.structured_data)??{};
  const explanation=asRecord(data.decision_explanation);
  const committeeDecision=text(data.committee_decision);
  const resolution=text(data.committee_resolution_status);
  const governanceEvent=data.governance_amendment_event===true;
  const learningCommittee=data.learning_committee===true;
  const isDecisionLike=Boolean(explanation||committeeDecision||resolution||governanceEvent||learningCommittee||row.message_kind==='decision'||row.message_kind==='recommendation');
  if(!isDecisionLike)return null;

  const current=asRecord(explanation?.current);
  const rule=asRecord(explanation?.rule);
  const memory=asRecord(explanation?.memory);
  const learning=asRecord(explanation?.learning);
  const title=
    text(data.committee_point_title)
    ??text(data.meeting_title)
    ??text(data.role_name)
    ??text(data.document_title)
    ??'قرار أو توصية مسجلة';
  const action=
    committeeDecision
    ??resolution
    ??text(data.response_type)
    ??text(data.action)
    ??String(row.message_kind??'decision');
  const confidence=numberValue(learning?.confidence??data.confidence??data.calculation_confidence);

  return {
    id:'conversation:'+String(row.id),
    source:committeeDecision||resolution?'COMMITTEE':'CONVERSATION',
    sourceRef:String(row.id),
    actor:{
      key:text(row.sender_key)??'unknown',
      name:text(row.sender_name)??'النظام',
      type:committeeDecision||resolution?'COMMITTEE':'ROLE',
    },
    decision:{
      title,
      action,
      status:resolution??text(data.candidate_status)??null,
    },
    current:{
      label:text(current?.label),
      value:text(current?.value),
      secondary:stringArray(current?.secondary),
    },
    rule:{
      code:text(rule?.code),
      title:text(rule?.title),
    },
    memory:{
      summary:text(memory?.summary),
      at:text(memory?.at),
    },
    learning:{
      algorithmName:text(learning?.algorithm_name),
      outcome:text(learning?.outcome),
      decisionUse:text(learning?.decision_use),
      confidence,
      sourceCycleIds:stringArray(learning?.source_cycle_ids),
    },
    confidence,
    why:text(explanation?.why)??text(data.committee_context_note)??text(row.body),
    outcome:null,
    externalExecution:data.external_execution===true,
    createdAt:String(row.created_at),
    rawImpact:data,
  };
}

export async function listUnifiedDecisionLog(userId:string,limit=200):Promise<UnifiedDecisionLogItem[]>{
  const safeLimit=Math.min(300,Math.max(1,Math.trunc(limit)));
  const sql=getRawSql();
  const [bankRows,conversationRows,learningTimeline]=await Promise.all([
    listBankDecisions(userId,safeLimit),
    sql`
      select id,sender_key,sender_name,sender_type,message_kind,body,structured_data,created_at
      from public.conversation_messages
      where user_id=${userId}::uuid
        and (
          structured_data ? 'decision_explanation'
          or structured_data ? 'committee_decision'
          or structured_data ? 'committee_resolution_status'
          or structured_data ? 'governance_amendment_event'
          or structured_data ? 'learning_committee'
          or message_kind in ('decision','recommendation')
        )
      order by created_at desc
      limit ${safeLimit}
    `,
    getFinancialLearningTimeline(userId).catch(()=>null),
  ]);

  const bank=bankRows.map(mapBankDecisionToUnified);
  const conversations=conversationRows
    .map(row=>mapConversationDecisionToUnified(row))
    .filter((item):item is UnifiedDecisionLogItem=>item!==null);

  const learning:UnifiedDecisionLogItem[]=learningTimeline
    ?learningTimeline.entries
      .filter(entry=>['APPROVAL','ACTIVATION','REJECTION','ROLLBACK','MONITORING'].includes(entry.phase))
      .map(entry=>({
        id:'learning:'+entry.id,
        source:'LEARNING',
        sourceRef:entry.algorithmKey,
        actor:{
          key:'financial-learning-engine',
          name:entry.algorithmName,
          type:'SYSTEM',
        },
        decision:{
          title:entry.title,
          action:entry.action,
          status:entry.outcome,
        },
        current:{
          label:'المعامل المتعلم',
          value:entry.resultingValue===null?null:String(entry.resultingValue),
          secondary:[
            'الخطأ قبل: '+String(entry.baselineErrorPercent??'غير متاح'),
            'الخطأ بعد: '+String(entry.candidateErrorPercent??'غير متاح'),
          ],
        },
        rule:{
          code:'LEARNING-SOFT-CALIBRATION',
          title:'التعلم يغير التوقعات الناعمة فقط ويظل قابلًا للتراجع',
        },
        memory:{
          summary:entry.learnedWhat,
          at:entry.at,
        },
        learning:{
          algorithmName:entry.algorithmName,
          outcome:entry.outcome,
          decisionUse:entry.outcome==='IMPROVED'||entry.outcome==='STABLE'?'SUPPORT':entry.outcome==='REVIEW_REQUIRED'||entry.outcome==='ROLLED_BACK'||entry.outcome==='REJECTED'?'CAUTION':'HISTORICAL_ONLY',
          confidence:entry.confidence,
          sourceCycleIds:entry.sourceCycleIds,
        },
        confidence:entry.confidence,
        why:entry.why,
        outcome:null,
        externalExecution:false,
        createdAt:entry.at,
        rawImpact:entry,
      }))
    :[];

  const combined=[...bank,...conversations,...learning]
    .sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))
    .slice(0,safeLimit);
  const registry=await syncDecisionOutcomeRegistry(userId,combined.map(item=>({
    id:item.id,
    source:item.source,
    externalExecution:item.externalExecution,
    createdAt:item.createdAt,
    learning:{
      outcome:item.learning.outcome,
      algorithmName:item.learning.algorithmName,
    },
  })));
  return combined.map(item=>({
    ...item,
    outcome:registry.outcomes[item.id]??null,
  }));
}
