export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { listUnifiedDecisionLog } from '@/features/decision-log/queries/list-unified-decision-log';
import { updateDecisionOutcome, type DecisionOutcomeEffect, type DecisionOutcomeQuality } from '@/lib/finance/decision-outcome-registry';

const headers={'Cache-Control':'private, no-store, max-age=0'};

export async function GET(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});

  const url=new URL(request.url);
  const requested=Number(url.searchParams.get('limit')??150);
  const limit=Number.isFinite(requested)?Math.min(300,Math.max(1,Math.trunc(requested))):150;

  try{
    const decisions=await listUnifiedDecisionLog(user.id,limit);
    return NextResponse.json({
      ok:true,
      decisions,
      summary:{
        count:decisions.length,
        explained:decisions.filter(item=>Boolean(item.rule.code||item.memory.summary||item.learning.algorithmName)).length,
        learningLinked:decisions.filter(item=>Boolean(item.learning.algorithmName)).length,
        externalExecution:decisions.filter(item=>item.externalExecution).length,
        outcomeAssessed:decisions.filter(item=>item.outcome&&item.outcome.effect!=='PENDING_EVIDENCE').length,
        positiveOutcome:decisions.filter(item=>item.outcome?.quality==='POSITIVE').length,
        negativeOutcome:decisions.filter(item=>item.outcome?.quality==='NEGATIVE').length,
        outcomeReviewRequired:decisions.filter(item=>item.outcome?.requiresReview===true).length,
      },
    },{headers});
  }catch(error){
    console.error('[unified-decision-log-get]',{
      name:error instanceof Error?error.name:'UnknownError',
    });
    return NextResponse.json({ok:false,error:'UNIFIED_DECISION_LOG_UNAVAILABLE'},{status:503,headers});
  }
}


const EFFECTS=new Set<DecisionOutcomeEffect>([
  'PENDING_EVIDENCE','EXECUTED','ACHIEVED','PARTIAL','MISSED','STABLE','REVERSED','NOT_APPLIED','SUPERSEDED',
]);
const QUALITIES=new Set<DecisionOutcomeQuality>(['POSITIVE','MIXED','NEGATIVE','UNDETERMINED']);

export async function POST(request:Request){
  const user=await requireAuthenticatedMutationUser('decision-outcome-update');
  try{
    const payload=await request.json().catch(()=>null) as Record<string,unknown>|null;
    const decisionId=typeof payload?.decisionId==='string'?payload.decisionId.trim():'';
    const source=typeof payload?.source==='string'?payload.source.trim():'';
    const effect=typeof payload?.effect==='string'?payload.effect as DecisionOutcomeEffect:null;
    const quality=typeof payload?.quality==='string'?payload.quality as DecisionOutcomeQuality:null;
    const summary=typeof payload?.summary==='string'?payload.summary.trim():'';
    const evidenceNote=typeof payload?.evidenceNote==='string'?payload.evidenceNote.trim():null;
    if(!decisionId||!source||!effect||!quality||!summary||!EFFECTS.has(effect)||!QUALITIES.has(quality)){
      return NextResponse.json({ok:false,error:'INVALID_DECISION_OUTCOME'},{status:422,headers});
    }
    const outcome=await updateDecisionOutcome({
      userId:user.id,
      decisionId,
      source,
      effect,
      quality,
      summary,
      evidenceNote,
      changedAfterDecision:Boolean(payload?.changedAfterDecision),
      requiresReview:Boolean(payload?.requiresReview),
    });
    return NextResponse.json({ok:true,outcome},{headers});
  }catch(error){
    console.error('[decision-outcome-update]',{
      name:error instanceof Error?error.name:'UnknownError',
    });
    return NextResponse.json({ok:false,error:'DECISION_OUTCOME_UPDATE_FAILED'},{status:500,headers});
  }
}
