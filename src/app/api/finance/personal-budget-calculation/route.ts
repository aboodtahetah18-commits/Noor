export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getLivePersonalBudgetCalculation } from '@/lib/finance/live-personal-budget-calculation';

const headers={'Cache-Control':'private, no-store, max-age=0'};

export async function GET(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});

  try{
    const url=new URL(request.url);
    const cycleId=url.searchParams.get('cycleId')?.trim()||undefined;
    const result=await getLivePersonalBudgetCalculation(user.id,cycleId);
    if(!result)return NextResponse.json({ok:false,error:'FINANCIAL_CYCLE_NOT_FOUND'},{status:404,headers});
    return NextResponse.json({ok:true,...result},{headers});
  }catch(error){
    const code=error instanceof Error?error.message:'PERSONAL_BUDGET_CALCULATION_FAILED';
    console.error('[personal-budget-calculation-get]',{
      name:error instanceof Error?error.name:'UnknownError',
      code,
    });
    return NextResponse.json({ok:false,error:code},{status:500,headers});
  }
}
