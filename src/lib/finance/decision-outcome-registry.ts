import { getRawSql } from '@/infrastructure/db/client';

const FACT_KEY='decision_outcome_registry';

export type DecisionOutcomeEffect=
  |'PENDING_EVIDENCE'
  |'EXECUTED'
  |'ACHIEVED'
  |'PARTIAL'
  |'MISSED'
  |'STABLE'
  |'REVERSED'
  |'NOT_APPLIED'
  |'SUPERSEDED';

export type DecisionOutcomeQuality='POSITIVE'|'MIXED'|'NEGATIVE'|'UNDETERMINED';

export type DecisionOutcomeEvidence={
  at:string;
  source:'SYSTEM'|'USER'|'LEARNING';
  note:string;
  metrics?:Record<string,string|number|null>;
};

export type DecisionOutcomeRecord={
  decisionId:string;
  source:string;
  effect:DecisionOutcomeEffect;
  quality:DecisionOutcomeQuality;
  summary:string;
  assessedAt:string|null;
  assessor:'SYSTEM'|'USER'|'LEARNING'|null;
  evidence:DecisionOutcomeEvidence[];
  changedAfterDecision:boolean;
  requiresReview:boolean;
};

export type DecisionOutcomeRegistry={
  version:1;
  updatedAt:string;
  outcomes:Record<string,DecisionOutcomeRecord>;
};

export type DecisionOutcomeSyncInput={
  id:string;
  source:string;
  externalExecution:boolean;
  createdAt:string;
  learning:{
    outcome:string|null;
    algorithmName:string|null;
  };
};

function emptyRegistry():DecisionOutcomeRegistry{
  return {version:1,updatedAt:new Date().toISOString(),outcomes:{}};
}

function asRecord(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

async function readRegistryFact(userId:string){
  const sql=getRawSql();
  const rows=await sql`
    select value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid
      and fact_key=${FACT_KEY}
      and status='ACTIVE'
    limit 1
  `;
  return rows[0]?.value_json??null;
}

async function writeRegistryFact(userId:string,registry:DecisionOutcomeRegistry){
  const sql=getRawSql();
  registry.updatedAt=new Date().toISOString();
  await sql`
    insert into public.user_foundation_facts(
      user_id,fact_key,category,value_json,source,confidence,verified_at,uses,requires_confirmation,status
    ) values(
      ${userId}::uuid,${FACT_KEY},'decision_outcomes',${JSON.stringify(registry)}::jsonb,
      'SYSTEM_DERIVED',1,now(),${['decision_audit','financial_learning','governance_review']},false,'ACTIVE'
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
}

export async function readDecisionOutcomeRegistry(userId:string):Promise<DecisionOutcomeRegistry>{
  const raw=asRecord(await readRegistryFact(userId));
  if(!raw)return emptyRegistry();
  const outcomes=asRecord(raw.outcomes)??{};
  return {
    version:1,
    updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt:new Date().toISOString(),
    outcomes:outcomes as Record<string,DecisionOutcomeRecord>,
  };
}

function learningOutcomeToRecord(input:DecisionOutcomeSyncInput):DecisionOutcomeRecord|null{
  const outcome=input.learning.outcome;
  if(!input.learning.algorithmName||!outcome)return null;
  const now=new Date().toISOString();
  if(outcome==='IMPROVED'){
    return {
      decisionId:input.id,source:input.source,effect:'ACHIEVED',quality:'POSITIVE',
      summary:'أظهرت مراقبة ما بعد التفعيل تحسنًا فعليًا في الدقة.',
      assessedAt:now,assessor:'LEARNING',
      evidence:[{at:now,source:'LEARNING',note:'نتيجة التعلم المسجلة: IMPROVED'}],
      changedAfterDecision:false,requiresReview:false,
    };
  }
  if(outcome==='STABLE'){
    return {
      decisionId:input.id,source:input.source,effect:'STABLE',quality:'MIXED',
      summary:'لم يظهر تدهور جوهري بعد التفعيل، لكن النتيجة لا تثبت تحسنًا واضحًا.',
      assessedAt:now,assessor:'LEARNING',
      evidence:[{at:now,source:'LEARNING',note:'نتيجة التعلم المسجلة: STABLE'}],
      changedAfterDecision:false,requiresReview:false,
    };
  }
  if(outcome==='REVIEW_REQUIRED'){
    return {
      decisionId:input.id,source:input.source,effect:'MISSED',quality:'NEGATIVE',
      summary:'النتيجة اللاحقة تدهورت بما يكفي لفتح مراجعة تراجع.',
      assessedAt:now,assessor:'LEARNING',
      evidence:[{at:now,source:'LEARNING',note:'نتيجة التعلم المسجلة: REVIEW_REQUIRED'}],
      changedAfterDecision:true,requiresReview:true,
    };
  }
  if(outcome==='ROLLED_BACK'){
    return {
      decisionId:input.id,source:input.source,effect:'REVERSED',quality:'NEGATIVE',
      summary:'تم التراجع عن المعايرة بعد تقييم أثرها.',
      assessedAt:now,assessor:'LEARNING',
      evidence:[{at:now,source:'LEARNING',note:'نتيجة التعلم المسجلة: ROLLED_BACK'}],
      changedAfterDecision:true,requiresReview:false,
    };
  }
  if(outcome==='REJECTED'){
    return {
      decisionId:input.id,source:input.source,effect:'NOT_APPLIED',quality:'UNDETERMINED',
      summary:'تم رفض المقترح قبل التفعيل، لذلك لا يوجد أثر فعلي يمكن تقييمه.',
      assessedAt:now,assessor:'LEARNING',
      evidence:[{at:now,source:'LEARNING',note:'نتيجة التعلم المسجلة: REJECTED'}],
      changedAfterDecision:false,requiresReview:false,
    };
  }
  return null;
}

function initialRecord(input:DecisionOutcomeSyncInput):DecisionOutcomeRecord{
  const learning=learningOutcomeToRecord(input);
  if(learning)return learning;
  if(input.source==='BANK_OPERATION'&&input.externalExecution){
    const now=new Date().toISOString();
    return {
      decisionId:input.id,source:input.source,effect:'EXECUTED',quality:'UNDETERMINED',
      summary:'التنفيذ الخارجي مسجل، لكن جودة الأثر تحتاج دليلًا لاحقًا ولا تستنتج من التنفيذ وحده.',
      assessedAt:now,assessor:'SYSTEM',
      evidence:[{at:now,source:'SYSTEM',note:'وجود حدث بنكي منفذ يثبت التنفيذ فقط، لا جودة القرار.'}],
      changedAfterDecision:false,requiresReview:false,
    };
  }
  return {
    decisionId:input.id,source:input.source,effect:'PENDING_EVIDENCE',quality:'UNDETERMINED',
    summary:'بانتظار دليل لاحق يسمح بتقييم أثر القرار دون افتراض علاقة سببية غير مثبتة.',
    assessedAt:null,assessor:null,evidence:[],changedAfterDecision:false,requiresReview:false,
  };
}

export async function syncDecisionOutcomeRegistry(
  userId:string,
  decisions:DecisionOutcomeSyncInput[],
){
  const registry=await readDecisionOutcomeRegistry(userId);
  let changed=false;
  for(const input of decisions){
    const nextLearning=learningOutcomeToRecord(input);
    const existing=registry.outcomes[input.id];
    if(!existing){
      registry.outcomes[input.id]=initialRecord(input);
      changed=true;
      continue;
    }
    if(nextLearning&&existing.assessor!=='USER'){
      const materialChange=
        existing.effect!==nextLearning.effect
        ||existing.quality!==nextLearning.quality
        ||existing.summary!==nextLearning.summary;
      if(materialChange){
        registry.outcomes[input.id]={
          ...nextLearning,
          evidence:[
            ...existing.evidence,
            ...nextLearning.evidence.filter(item=>!existing.evidence.some(previous=>previous.note===item.note)),
          ],
        };
        changed=true;
      }
    }
  }
  if(changed)await writeRegistryFact(userId,registry);
  return registry;
}

export async function updateDecisionOutcome(args:{
  userId:string;
  decisionId:string;
  source:string;
  effect:DecisionOutcomeEffect;
  quality:DecisionOutcomeQuality;
  summary:string;
  evidenceNote?:string|null;
  changedAfterDecision?:boolean;
  requiresReview?:boolean;
}){
  const registry=await readDecisionOutcomeRegistry(args.userId);
  const now=new Date().toISOString();
  const existing=registry.outcomes[args.decisionId]??{
    decisionId:args.decisionId,
    source:args.source,
    effect:'PENDING_EVIDENCE' as DecisionOutcomeEffect,
    quality:'UNDETERMINED' as DecisionOutcomeQuality,
    summary:'',
    assessedAt:null,
    assessor:null,
    evidence:[],
    changedAfterDecision:false,
    requiresReview:false,
  };
  const note=args.evidenceNote?.trim()||args.summary.trim();
  registry.outcomes[args.decisionId]={
    ...existing,
    source:args.source,
    effect:args.effect,
    quality:args.quality,
    summary:args.summary.trim().slice(0,1200),
    assessedAt:now,
    assessor:'USER',
    evidence:[
      ...existing.evidence,
      {at:now,source:'USER',note:note.slice(0,1200)},
    ],
    changedAfterDecision:Boolean(args.changedAfterDecision),
    requiresReview:Boolean(args.requiresReview),
  };
  await writeRegistryFact(args.userId,registry);
  return registry.outcomes[args.decisionId];
}
