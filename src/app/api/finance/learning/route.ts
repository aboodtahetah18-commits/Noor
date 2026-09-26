export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import {
  readFinancialContinuousLearning,
  refreshFinancialContinuousLearning,
} from '@/lib/finance/financial-continuous-learning-engine';
import { buildFinancialLearningChangeCandidates } from '@/lib/finance/financial-learning-change-candidates';
import {
  advanceFinancialLearningLifecycle,
  readActiveFinancialLearningFactors,
  syncFinancialLearningLifecycle,
} from '@/lib/finance/financial-learning-lifecycle';
import { monitorActiveFinancialLearning } from '@/lib/finance/financial-learning-monitor';
import { buildFinancialLearningTimeline } from '@/lib/finance/financial-learning-timeline';
import { refreshDecisionOutcomeLearning } from '@/lib/finance/decision-outcome-learning-engine';

const headers={'Cache-Control':'private, no-store, max-age=0'};

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});

  try{
    const stored=await readFinancialContinuousLearning(user.id);
    const profile=stored??await refreshFinancialContinuousLearning(user.id);
    const candidates=buildFinancialLearningChangeCandidates(profile);
    await syncFinancialLearningLifecycle(user.id,profile);
    const activeFactors=await readActiveFinancialLearningFactors(user.id);
    const monitoring=await monitorActiveFinancialLearning(user.id);
    const timeline=buildFinancialLearningTimeline(monitoring.store);
    const decisionOutcomeLearning=await refreshDecisionOutcomeLearning(user.id);
    return NextResponse.json({
      ok:true,
      profile,
      candidates,
      reviewEligible:candidates.filter(item=>item.status==='ELIGIBLE_FOR_REVIEW'),
      lifecycle:monitoring.store,
      activeFactors,
      monitoring:{
        activeItems:monitoring.activeItems,
        rollbackReviewRequired:monitoring.rollbackReviewRequired,
        hasRollbackReviewRequired:monitoring.hasRollbackReviewRequired,
      },
      timeline,
      decisionOutcomeLearning,
    },{headers});
  }catch(error){
    console.error('[financial-learning-get]',{
      name:error instanceof Error?error.name:'UnknownError',
    });
    return NextResponse.json({ok:false,error:'FINANCIAL_LEARNING_UNAVAILABLE'},{status:503,headers});
  }
}


export async function POST(request:Request){
  const user=await requireAuthenticatedMutationUser('financial-learning-lifecycle');
  try{
    const payload=await request.json().catch(()=>null) as Record<string,unknown>|null;
    const action=typeof payload?.action==='string'?payload.action:'';
    const candidateKey=typeof payload?.candidateKey==='string'?payload.candidateKey.trim():'';
    const note=typeof payload?.note==='string'?payload.note.trim().slice(0,1000):null;
    if(!candidateKey||!['SUBMIT_REVIEW','APPROVE','REJECT','ACTIVATE','ROLLBACK'].includes(action)){
      return NextResponse.json({ok:false,error:'INVALID_REQUEST'},{status:422,headers});
    }
    const result=await advanceFinancialLearningLifecycle({
      userId:user.id,
      candidateKey,
      action:action as 'SUBMIT_REVIEW'|'APPROVE'|'REJECT'|'ACTIVATE'|'ROLLBACK',
      note,
    });
    return NextResponse.json({ok:true,...result},{headers});
  }catch(error){
    const code=error instanceof Error?error.message:'FINANCIAL_LEARNING_LIFECYCLE_FAILED';
    const status=code==='FINANCIAL_LEARNING_CANDIDATE_NOT_FOUND'
      ?404
      :code==='GOVERNANCE_AUTHORITY_DENIED'
        ?403
        :code==='FINANCIAL_LEARNING_INVALID_TRANSITION'
          ?409
          :code==='FINANCIAL_LEARNING_PARAMETER_NOT_ACTIVATABLE'
            ?422
            :500;
    console.error('[financial-learning-post]',{name:error instanceof Error?error.name:'UnknownError',code});
    return NextResponse.json({ok:false,error:code},{status,headers});
  }
}
