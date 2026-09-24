import { NextResponse } from 'next/server';
import { runFinancialEngineRecalcJob } from '@/features/financial-engine/jobs/run-financial-engine-recalc';
import { logServerError } from '@/security/safe-logging';
import { runHilalRecoveryFollowupJob } from '@/lib/conversations/hilal-recovery-followup';
import { runFinancialPlanMonitoringJob } from '@/lib/allocation/financial-plan-monitoring';
import { runDailyConversationOrchestratorJob } from '@/lib/conversations/daily-conversation-orchestrator';

export const dynamic='force-dynamic';
export const runtime='nodejs';

function authorized(request:Request){
  const header=request.headers.get('authorization');
  const secrets=[process.env.CRON_SECRET,process.env.JOB_SECRET].filter((value):value is string=>Boolean(value));
  return secrets.some((secret)=>header===`Bearer ${secret}`);
}

async function run(request:Request){
  if(!authorized(request))return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers:{'Cache-Control':'no-store'}});
  try{
    const [results,hilalRecovery,planMonitoring,proactiveConversations]=await Promise.all([
      runFinancialEngineRecalcJob(),
      runHilalRecoveryFollowupJob(),
      runFinancialPlanMonitoringJob(),
      runDailyConversationOrchestratorJob(),
    ]);
    const failed=results.filter((x)=>x.status==='FAILED').length;
    const hilalFailed=hilalRecovery.filter((x)=>x.status==='FAILED').length;
    const planMonitoringFailed=planMonitoring.filter((x)=>x.status==='FAILED').length;
    const proactiveFailed=proactiveConversations.filter((x)=>x.status==='FAILED').length;
    const totalFailed=failed+hilalFailed+planMonitoringFailed+proactiveFailed;
    return NextResponse.json({
      ok:totalFailed===0,
      processed:results.length,
      failed,
      results,
      hilalRecovery:{processed:hilalRecovery.length,failed:hilalFailed,results:hilalRecovery},
      planMonitoring:{processed:planMonitoring.length,failed:planMonitoringFailed,results:planMonitoring},
      proactiveConversations:{processed:proactiveConversations.length,failed:proactiveFailed,results:proactiveConversations},
    },{status:totalFailed===0?200:207,headers:{'Cache-Control':'no-store'}});
  }catch{
    const requestId=logServerError('financial-engine-recalc-job-failed',{endpoint:'/api/jobs/financial-engine'});
    return NextResponse.json({ok:false,error:'FINANCIAL_ENGINE_RECALC_JOB_FAILED',requestId},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}

export const GET=run;
export const POST=run;
