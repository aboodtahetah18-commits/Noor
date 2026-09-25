export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import {
  calculateFinancialContinuousLearning,
  refreshFinancialContinuousLearning,
} from '@/lib/finance/financial-continuous-learning-engine';

const headers={'Cache-Control':'private, no-store, max-age=0'};

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  try{
    const profile=await calculateFinancialContinuousLearning(user.id);
    return NextResponse.json({ok:true,profile},{headers});
  }catch(error){
    console.error('[continuous-learning-get]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({ok:false,error:'CONTINUOUS_LEARNING_UNAVAILABLE'},{status:503,headers});
  }
}

export async function POST(){
  const user=await requireAuthenticatedMutationUser('continuous-learning-refresh');
  try{
    const profile=await refreshFinancialContinuousLearning(user.id);
    return NextResponse.json({ok:true,profile},{headers});
  }catch(error){
    console.error('[continuous-learning-refresh]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({ok:false,error:'CONTINUOUS_LEARNING_REFRESH_FAILED'},{status:503,headers});
  }
}
