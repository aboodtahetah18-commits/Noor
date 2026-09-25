export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import {
  getFinancialDecisionExplanation,
} from '@/lib/finance/financial-decision-explanation';
import type { FinancialDecisionLearningDomain } from '@/lib/finance/financial-learning-decision-context';

const headers={'Cache-Control':'private, no-store, max-age=0'};
const DOMAINS=new Set<FinancialDecisionLearningDomain>([
  'budget_spending',
  'liquidity_protection',
  'goals',
  'obligations',
  'investment',
  'forecast',
]);

export async function GET(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});

  const url=new URL(request.url);
  const domain=url.searchParams.get('domain') as FinancialDecisionLearningDomain|null;
  if(!domain||!DOMAINS.has(domain)){
    return NextResponse.json({ok:false,error:'INVALID_DECISION_DOMAIN'},{status:422,headers});
  }

  try{
    const explanation=await getFinancialDecisionExplanation(user.id,domain);
    return NextResponse.json({ok:true,explanation},{headers});
  }catch(error){
    console.error('[financial-decision-explanation-get]',{
      name:error instanceof Error?error.name:'UnknownError',
    });
    return NextResponse.json({ok:false,error:'DECISION_EXPLANATION_UNAVAILABLE'},{status:503,headers});
  }
}
