export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import {
  readFinancialContinuousLearning,
  refreshFinancialContinuousLearning,
} from '@/lib/finance/financial-continuous-learning-engine';
import { buildFinancialLearningChangeCandidates } from '@/lib/finance/financial-learning-change-candidates';

const headers={'Cache-Control':'private, no-store, max-age=0'};

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});

  try{
    const stored=await readFinancialContinuousLearning(user.id);
    const profile=stored??await refreshFinancialContinuousLearning(user.id);
    const candidates=buildFinancialLearningChangeCandidates(profile);
    return NextResponse.json({
      ok:true,
      profile,
      candidates,
      reviewEligible:candidates.filter(item=>item.status==='ELIGIBLE_FOR_REVIEW'),
    },{headers});
  }catch(error){
    console.error('[financial-learning-get]',{
      name:error instanceof Error?error.name:'UnknownError',
    });
    return NextResponse.json({ok:false,error:'FINANCIAL_LEARNING_UNAVAILABLE'},{status:503,headers});
  }
}
