import { NextResponse } from 'next/server';
import { runFinancialEngineRecalcJob } from '@/features/financial-engine/jobs/run-financial-engine-recalc';
import { logServerError } from '@/security/safe-logging';

export const dynamic='force-dynamic';
export const runtime='nodejs';

function authorized(request:Request){
  const expected=process.env.JOB_SECRET;
  if(!expected)return false;
  return request.headers.get('authorization')===`Bearer ${expected}`;
}

export async function POST(request:Request){
  if(!authorized(request))return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers:{'Cache-Control':'no-store'}});
  try{
    const results=await runFinancialEngineRecalcJob();
    const failed=results.filter((x)=>x.status==='FAILED').length;
    return NextResponse.json({ok:failed===0,processed:results.length,failed,results},{status:failed===0?200:207,headers:{'Cache-Control':'no-store'}});
  }catch{
    const requestId=logServerError('financial-engine-recalc-job-failed',{endpoint:'/api/jobs/financial-engine'});
    return NextResponse.json({ok:false,error:'FINANCIAL_ENGINE_RECALC_JOB_FAILED',requestId},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}
