export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listUnifiedDecisionLog } from '@/features/decision-log/queries/list-unified-decision-log';

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
      },
    },{headers});
  }catch(error){
    console.error('[unified-decision-log-get]',{
      name:error instanceof Error?error.name:'UnknownError',
    });
    return NextResponse.json({ok:false,error:'UNIFIED_DECISION_LOG_UNAVAILABLE'},{status:503,headers});
  }
}
