import { getRawSql } from '@/infrastructure/db/client';
import {
  readDecisionOutcomeRegistry,
  type DecisionOutcomeQuality,
} from '@/lib/finance/decision-outcome-registry';
import type { FinancialDecisionLearningDomain } from '@/lib/finance/financial-learning-decision-context';

const FACT_KEY='decision_outcome_learning_profile';
const MIN_PATTERN_SAMPLE=3;
const MAX_DECISIONS=120;

export type DecisionOutcomeLearningStance='SUPPORT'|'CAUTION'|'NEUTRAL'|'INSUFFICIENT';

export type DecisionOutcomeLearningPattern={
  key:string;
  domain:FinancialDecisionLearningDomain;
  ruleCode:string;
  actorKey:string;
  action:string;
  sampleSize:number;
  positive:number;
  mixed:number;
  negative:number;
  positiveRate:number;
  negativeRate:number;
  score:number;
  confidence:number;
  stance:DecisionOutcomeLearningStance;
  summary:string;
  decisionIds:string[];
};

export type DecisionOutcomeLearningProfile={
  version:1;
  updatedAt:string;
  assessedDecisions:number;
  patterns:DecisionOutcomeLearningPattern[];
  safeguards:{
    minimumPatternSample:number;
    changesHardRules:false;
    changesFinancialTruth:false;
    autoExecute:false;
    use:'recommendation_weighting_and_explanation_only';
  };
};

export type DecisionOutcomeLearningContext={
  domain:FinancialDecisionLearningDomain;
  stance:DecisionOutcomeLearningStance;
  sampleSize:number;
  confidence:number;
  positiveRate:number;
  negativeRate:number;
  ruleCode:string;
  actorKey:string;
  action:string;
  decisionIds:string[];
  shortText:string;
};

export type DecisionOutcomeLearningDecisionOutcomeLearningDecisionMetadata={
  decisionId:string;
  domain:FinancialDecisionLearningDomain;
  ruleCode:string;
  actorKey:string;
  action:string;
};

const RULE_DOMAIN:Record<string,FinancialDecisionLearningDomain>={
  'RULE-BUDGET-TRUE-AVAILABLE':'budget_spending',
  'RULE-LIQUIDITY-PROTECT-FIRST':'liquidity_protection',
  'RULE-GOAL-SAFE-CONTRIBUTION':'goals',
  'RULE-OBLIGATIONS-PROTECTED':'obligations',
  'RULE-INVEST-SURPLUS-ONLY':'investment',
  'RULE-FORECAST-SOFT-NOT-FACT':'forecast',
};

function asRecord(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

function cleanText(value:unknown,fallback=''){
  return typeof value==='string'&&value.trim()?value.trim():fallback;
}

function qualityScore(quality:DecisionOutcomeQuality){
  if(quality==='POSITIVE')return 1;
  if(quality==='NEGATIVE')return -1;
  return 0;
}

function patternConfidence(sampleSize:number,score:number){
  const sample=Math.min(1,sampleSize/8);
  const consistency=Math.min(1,Math.abs(score));
  return Math.round((sample*0.65+consistency*0.35)*100);
}

function stanceFor(sampleSize:number,score:number):DecisionOutcomeLearningStance{
  if(sampleSize<MIN_PATTERN_SAMPLE)return 'INSUFFICIENT';
  if(score>=0.34)return 'SUPPORT';
  if(score<=-0.34)return 'CAUTION';
  return 'NEUTRAL';
}

function summaryFor(pattern:{
  domain:FinancialDecisionLearningDomain;
  sampleSize:number;
  positiveRate:number;
  negativeRate:number;
  stance:DecisionOutcomeLearningStance;
}){
  const positive=Math.round(pattern.positiveRate*100);
  const negative=Math.round(pattern.negativeRate*100);
  if(pattern.stance==='SUPPORT'){
    return 'هذا النوع من التوصيات حقق نتائج إيجابية في '+positive+'٪ من '+pattern.sampleSize+' قرارات مقيمة، لذلك يمكن استخدامه كدليل مساعد لا كقاعدة حاكمة.';
  }
  if(pattern.stance==='CAUTION'){
    return 'هذا النوع من التوصيات سجل نتائج سلبية في '+negative+'٪ من '+pattern.sampleSize+' قرارات مقيمة، لذلك يجب تخفيف الاعتماد عليه وطلب سياق إضافي قبل تكراره.';
  }
  if(pattern.stance==='NEUTRAL'){
    return 'نتائج هذا النوع من التوصيات مختلطة عبر '+pattern.sampleSize+' قرارات، لذلك لا يوجد اتجاه كافٍ لزيادة أو خفض وزنه.';
  }
  return 'لا توجد نتائج مقيمة كافية بعد للحكم على فعالية هذا النوع من التوصيات.';
}

export function buildDecisionOutcomeLearningProfile(
  metadata:DecisionOutcomeLearningDecisionMetadata[],
  outcomes:Awaited<ReturnType<typeof readDecisionOutcomeRegistry>>['outcomes'],
):DecisionOutcomeLearningProfile{
  const groups=new Map<string,{meta:DecisionOutcomeLearningDecisionMetadata;decisionIds:string[];qualities:DecisionOutcomeQuality[]}>();

  for(const item of metadata){
    const outcome=outcomes[item.decisionId];
    if(!outcome||outcome.quality==='UNDETERMINED')continue;
    const key=[item.domain,item.ruleCode,item.actorKey,item.action].join('|');
    const group=groups.get(key)??{meta:item,decisionIds:[],qualities:[]};
    group.decisionIds.push(item.decisionId);
    group.qualities.push(outcome.quality);
    groups.set(key,group);
  }

  const patterns=[...groups.entries()].map(([key,group])=>{
    const positive=group.qualities.filter(item=>item==='POSITIVE').length;
    const mixed=group.qualities.filter(item=>item==='MIXED').length;
    const negative=group.qualities.filter(item=>item==='NEGATIVE').length;
    const sampleSize=group.qualities.length;
    const score=sampleSize
      ?group.qualities.reduce((sum,item)=>sum+qualityScore(item),0)/sampleSize
      :0;
    const positiveRate=sampleSize?positive/sampleSize:0;
    const negativeRate=sampleSize?negative/sampleSize:0;
    const stance=stanceFor(sampleSize,score);
    const confidence=patternConfidence(sampleSize,score);
    const partial={
      key,
      domain:group.meta.domain,
      ruleCode:group.meta.ruleCode,
      actorKey:group.meta.actorKey,
      action:group.meta.action,
      sampleSize,
      positive,
      mixed,
      negative,
      positiveRate,
      negativeRate,
      score,
      confidence,
      stance,
      decisionIds:group.decisionIds.slice(-20),
    };
    return {
      ...partial,
      summary:summaryFor(partial),
    };
  }).sort((a,b)=>b.sampleSize-a.sampleSize||b.confidence-a.confidence);

  return {
    version:1,
    updatedAt:new Date().toISOString(),
    assessedDecisions:new Set(patterns.flatMap(item=>item.decisionIds)).size,
    patterns,
    safeguards:{
      minimumPatternSample:MIN_PATTERN_SAMPLE,
      changesHardRules:false,
      changesFinancialTruth:false,
      autoExecute:false,
      use:'recommendation_weighting_and_explanation_only',
    },
  };
}

async function readDecisionOutcomeLearningDecisionMetadata(userId:string):Promise<DecisionOutcomeLearningDecisionMetadata[]>{
  const sql=getRawSql();
  const rows=await sql`
    select id,sender_key,message_kind,structured_data
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data ? 'decision_explanation'
    order by created_at desc
    limit ${MAX_DECISIONS}
  `;

  const result:DecisionOutcomeLearningDecisionMetadata[]=[];
  for(const row of rows){
    const data=asRecord(row.structured_data)??{};
    const explanation=asRecord(data.decision_explanation);
    const rule=asRecord(explanation?.rule);
    const ruleCode=cleanText(rule?.code);
    const domain=RULE_DOMAIN[ruleCode];
    if(!domain)continue;
    const action=
      cleanText(data.committee_decision)
      ||cleanText(data.committee_resolution_status)
      ||cleanText(data.response_type)
      ||cleanText(data.action)
      ||cleanText(row.message_kind,'decision');
    result.push({
      decisionId:'conversation:'+String(row.id),
      domain,
      ruleCode,
      actorKey:cleanText(row.sender_key,'unknown'),
      action,
    });
  }
  return result;
}

export async function readDecisionOutcomeLearningProfile(userId:string):Promise<DecisionOutcomeLearningProfile|null>{
  const sql=getRawSql();
  const rows=await sql`
    select value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid
      and fact_key=${FACT_KEY}
      and status='ACTIVE'
    limit 1
  `;
  const value=rows[0]?.value_json;
  return value&&typeof value==='object'&&!Array.isArray(value)
    ?value as DecisionOutcomeLearningProfile
    :null;
}

function sameProfile(a:DecisionOutcomeLearningProfile|null,b:DecisionOutcomeLearningProfile){
  if(!a)return false;
  return JSON.stringify({
    assessedDecisions:a.assessedDecisions,
    patterns:a.patterns,
    safeguards:a.safeguards,
  })===JSON.stringify({
    assessedDecisions:b.assessedDecisions,
    patterns:b.patterns,
    safeguards:b.safeguards,
  });
}

async function writeProfile(userId:string,profile:DecisionOutcomeLearningProfile){
  const sql=getRawSql();
  await sql`
    insert into public.user_foundation_facts(
      user_id,fact_key,category,value_json,source,confidence,verified_at,uses,requires_confirmation,status
    ) values(
      ${userId}::uuid,${FACT_KEY},'learning',${JSON.stringify(profile)}::jsonb,
      'SYSTEM_DERIVED',1,now(),${['decision_learning','recommendation_explanation','audit']},false,'ACTIVE'
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

export async function refreshDecisionOutcomeLearning(userId:string){
  const [metadata,registry]=await Promise.all([
    readDecisionOutcomeLearningDecisionMetadata(userId),
    readDecisionOutcomeRegistry(userId),
  ]);
  const profile=buildDecisionOutcomeLearningProfile(metadata,registry.outcomes);
  const stored=await readDecisionOutcomeLearningProfile(userId);
  if(sameProfile(stored,profile))return stored!;
  await writeProfile(userId,profile);
  return profile;
}

export function decisionOutcomeLearningContextFromProfile(
  profile:DecisionOutcomeLearningProfile,
  domain:FinancialDecisionLearningDomain,
):DecisionOutcomeLearningContext|null{
  const pattern=profile.patterns
    .filter(item=>item.domain===domain)
    .sort((a,b)=>{
      const rank=(value:DecisionOutcomeLearningStance)=>value==='CAUTION'?4:value==='SUPPORT'?3:value==='NEUTRAL'?2:1;
      return rank(b.stance)-rank(a.stance)||b.confidence-a.confidence||b.sampleSize-a.sampleSize;
    })[0]??null;
  if(!pattern)return null;
  return {
    domain,
    stance:pattern.stance,
    sampleSize:pattern.sampleSize,
    confidence:pattern.confidence,
    positiveRate:pattern.positiveRate,
    negativeRate:pattern.negativeRate,
    ruleCode:pattern.ruleCode,
    actorKey:pattern.actorKey,
    action:pattern.action,
    decisionIds:pattern.decisionIds,
    shortText:pattern.summary,
  };
}

export async function getDecisionOutcomeLearningContext(
  userId:string,
  domain:FinancialDecisionLearningDomain,
):Promise<DecisionOutcomeLearningContext|null>{
  const profile=await refreshDecisionOutcomeLearning(userId);
  return decisionOutcomeLearningContextFromProfile(profile,domain);
}
