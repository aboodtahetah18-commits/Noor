import { getRawSql } from '@/infrastructure/db/client';
import { assertRoleCompactAuthority } from '@/lib/governance/algorithm-role-registry';
import {
  refreshFinancialContinuousLearning,
  type FinancialLearningProfile,
} from '@/lib/finance/financial-continuous-learning-engine';
import {
  buildFinancialLearningChangeCandidates,
  type FinancialLearningChangeCandidate,
} from '@/lib/finance/financial-learning-change-candidates';

const LIFECYCLE_FACT_KEY='financial_learning_change_lifecycle';
const ACTIVE_FACTORS_FACT_KEY='financial_learning_active_factors';

export type FinancialLearningLifecycleStatus=
  |'BACKTEST_PASSED'
  |'IN_REVIEW'
  |'APPROVED'
  |'ACTIVE'
  |'REJECTED'
  |'ROLLED_BACK';

export type FinancialLearningLifecycleEvent={
  at:string;
  action:'SYNC'|'SUBMIT_REVIEW'|'APPROVE'|'REJECT'|'ACTIVATE'|'ROLLBACK';
  actorRole:string;
  note:string|null;
  from:FinancialLearningLifecycleStatus|null;
  to:FinancialLearningLifecycleStatus;
};

export type FinancialLearningLifecycleItem={
  key:string;
  title:string;
  kind:FinancialLearningChangeCandidate['kind'];
  parameterKey:string;
  ownerBank:FinancialLearningChangeCandidate['ownerBank'];
  confidence:number;
  proposedValue:number;
  baselineErrorPercent:number|null;
  candidateErrorPercent:number|null;
  improvementPercent:number|null;
  status:FinancialLearningLifecycleStatus;
  createdAt:string;
  reviewedAt:string|null;
  approvedAt:string|null;
  activatedAt:string|null;
  rejectedAt:string|null;
  rolledBackAt:string|null;
  previousActiveValue:number|null;
  history:FinancialLearningLifecycleEvent[];
};

export type FinancialLearningLifecycleStore={
  version:1;
  updatedAt:string;
  items:Record<string,FinancialLearningLifecycleItem>;
};

export type FinancialLearningActiveFactors={
  version:1;
  updatedAt:string;
  factors:{
    expenseBaselineFactor:number;
    savingExpectationFactor:number;
    incomeRealizationFactor:number;
  };
  sources:Record<string,{candidateKey:string;activatedAt:string;previousValue:number}>;
};

const defaultFactors=():FinancialLearningActiveFactors=>({
  version:1,
  updatedAt:new Date().toISOString(),
  factors:{expenseBaselineFactor:1,savingExpectationFactor:1,incomeRealizationFactor:1},
  sources:{},
});

function emptyStore():FinancialLearningLifecycleStore{
  return {version:1,updatedAt:new Date().toISOString(),items:{}};
}

function record(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

async function readFact(userId:string,factKey:string){
  const sql=getRawSql();
  const rows=await sql`
    select value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid
      and fact_key=${factKey}
      and status='ACTIVE'
    limit 1
  `;
  return rows[0]?.value_json??null;
}

async function writeFact(userId:string,factKey:string,category:string,value:unknown,uses:string[]){
  const sql=getRawSql();
  await sql`
    insert into public.user_foundation_facts(
      user_id,fact_key,category,value_json,source,confidence,verified_at,uses,requires_confirmation,status
    ) values(
      ${userId}::uuid,${factKey},${category},${JSON.stringify(value)}::jsonb,
      'SYSTEM_DERIVED',1,now(),${uses},false,'ACTIVE'
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

export async function readFinancialLearningLifecycle(userId:string):Promise<FinancialLearningLifecycleStore>{
  const value=record(await readFact(userId,LIFECYCLE_FACT_KEY));
  if(!value)return emptyStore();
  const items=record(value.items)??{};
  return {
    version:1,
    updatedAt:typeof value.updatedAt==='string'?value.updatedAt:new Date().toISOString(),
    items:items as Record<string,FinancialLearningLifecycleItem>,
  };
}

export async function readActiveFinancialLearningFactors(userId:string):Promise<FinancialLearningActiveFactors>{
  const value=record(await readFact(userId,ACTIVE_FACTORS_FACT_KEY));
  if(!value)return defaultFactors();
  const factors=record(value.factors)??{};
  const safe=(key:string)=>{
    const n=Number(factors[key]);
    return Number.isFinite(n)&&n>0?n:1;
  };
  return {
    version:1,
    updatedAt:typeof value.updatedAt==='string'?value.updatedAt:new Date().toISOString(),
    factors:{
      expenseBaselineFactor:safe('expenseBaselineFactor'),
      savingExpectationFactor:safe('savingExpectationFactor'),
      incomeRealizationFactor:safe('incomeRealizationFactor'),
    },
    sources:(record(value.sources)??{}) as FinancialLearningActiveFactors['sources'],
  };
}

function lifecycleCandidate(candidate:FinancialLearningChangeCandidate){
  return candidate.status==='ELIGIBLE_FOR_REVIEW'
    &&candidate.parameterKey!==null
    &&candidate.proposedValue!==null;
}

export async function syncFinancialLearningLifecycle(userId:string,profile?:FinancialLearningProfile){
  const currentProfile=profile??await refreshFinancialContinuousLearning(userId);
  const candidates=buildFinancialLearningChangeCandidates(currentProfile);
  const store=await readFinancialLearningLifecycle(userId);
  const now=new Date().toISOString();
  let changed=false;

  for(const candidate of candidates){
    if(!lifecycleCandidate(candidate)||store.items[candidate.key])continue;
    store.items[candidate.key]={
      key:candidate.key,
      title:candidate.title,
      kind:candidate.kind,
      parameterKey:candidate.parameterKey!,
      ownerBank:candidate.ownerBank,
      confidence:candidate.confidence,
      proposedValue:candidate.proposedValue!,
      baselineErrorPercent:candidate.before.meanAbsoluteErrorPercent,
      candidateErrorPercent:candidate.after.meanAbsoluteErrorPercent,
      improvementPercent:candidate.improvementPercent,
      status:'BACKTEST_PASSED',
      createdAt:now,
      reviewedAt:null,
      approvedAt:null,
      activatedAt:null,
      rejectedAt:null,
      rolledBackAt:null,
      previousActiveValue:null,
      history:[{
        at:now,action:'SYNC',actorRole:'financial-learning-engine',
        note:'نجح المرشح في الاختبار الخلفي وأصبح مؤهلًا للمراجعة.',
        from:null,to:'BACKTEST_PASSED',
      }],
    };
    changed=true;
  }

  if(changed){
    store.updatedAt=now;
    await writeFact(userId,LIFECYCLE_FACT_KEY,'learning',store,['financial_learning','governance_review','audit']);
  }
  return {profile:currentProfile,candidates,store};
}

function factorKey(parameterKey:string):keyof FinancialLearningActiveFactors['factors']{
  if(parameterKey==='forecast.expenseBaselineFactor')return 'expenseBaselineFactor';
  if(parameterKey==='forecast.savingExpectationFactor')return 'savingExpectationFactor';
  if(parameterKey==='forecast.incomeRealizationFactor')return 'incomeRealizationFactor';
  throw new Error('FINANCIAL_LEARNING_PARAMETER_NOT_ACTIVATABLE');
}

function allowedTransition(status:FinancialLearningLifecycleStatus,action:'SUBMIT_REVIEW'|'APPROVE'|'REJECT'|'ACTIVATE'|'ROLLBACK'){
  if(action==='SUBMIT_REVIEW')return status==='BACKTEST_PASSED';
  if(action==='APPROVE'||action==='REJECT')return status==='IN_REVIEW';
  if(action==='ACTIVATE')return status==='APPROVED';
  if(action==='ROLLBACK')return status==='ACTIVE';
  return false;
}

export async function advanceFinancialLearningLifecycle(args:{
  userId:string;
  candidateKey:string;
  action:'SUBMIT_REVIEW'|'APPROVE'|'REJECT'|'ACTIVATE'|'ROLLBACK';
  note?:string|null;
}){
  const synced=await syncFinancialLearningLifecycle(args.userId);
  const store=synced.store;
  const item=store.items[args.candidateKey];
  if(!item)throw new Error('FINANCIAL_LEARNING_CANDIDATE_NOT_FOUND');
  if(!allowedTransition(item.status,args.action))throw new Error('FINANCIAL_LEARNING_INVALID_TRANSITION');

  const now=new Date().toISOString();
  const previous=item.status;
  let actorRole='central-bank-manager';
  let next:FinancialLearningLifecycleStatus=previous;

  if(args.action==='SUBMIT_REVIEW'){
    assertRoleCompactAuthority('central-bank-manager','ESCALATE_CASE');
    actorRole='central-bank-manager';
    next='IN_REVIEW';
    item.reviewedAt=now;
  }else if(args.action==='APPROVE'){
    assertRoleCompactAuthority('central-governor','RECOMMEND_WITHIN_DOMAIN');
    actorRole='central-governor';
    next='APPROVED';
    item.approvedAt=now;
  }else if(args.action==='REJECT'){
    assertRoleCompactAuthority('central-governor','RECOMMEND_WITHIN_DOMAIN');
    actorRole='central-governor';
    next='REJECTED';
    item.rejectedAt=now;
  }else if(args.action==='ACTIVATE'){
    assertRoleCompactAuthority('central-bank-manager','RECORD_INTERNAL_CONTEXT');
    actorRole='central-bank-manager';
    const active=await readActiveFinancialLearningFactors(args.userId);
    const key=factorKey(item.parameterKey);
    const previousValue=active.factors[key];
    item.previousActiveValue=previousValue;
    active.factors[key]=item.proposedValue;
    active.sources[key]={candidateKey:item.key,activatedAt:now,previousValue};
    active.updatedAt=now;
    await writeFact(args.userId,ACTIVE_FACTORS_FACT_KEY,'learning',active,['forecasting','financial_learning','audit']);
    next='ACTIVE';
    item.activatedAt=now;
  }else{
    assertRoleCompactAuthority('central-bank-manager','RECORD_INTERNAL_CONTEXT');
    actorRole='central-bank-manager';
    const active=await readActiveFinancialLearningFactors(args.userId);
    const key=factorKey(item.parameterKey);
    active.factors[key]=item.previousActiveValue??1;
    delete active.sources[key];
    active.updatedAt=now;
    await writeFact(args.userId,ACTIVE_FACTORS_FACT_KEY,'learning',active,['forecasting','financial_learning','audit']);
    next='ROLLED_BACK';
    item.rolledBackAt=now;
  }

  item.status=next;
  item.history.push({
    at:now,action:args.action,actorRole,note:args.note?.trim()||null,from:previous,to:next,
  });
  store.updatedAt=now;
  await writeFact(args.userId,LIFECYCLE_FACT_KEY,'learning',store,['financial_learning','governance_review','audit']);

  return {item,store,activeFactors:await readActiveFinancialLearningFactors(args.userId)};
}
