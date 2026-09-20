import { NextResponse } from 'next/server';
import { runWeeklyAnalysisJob } from '@/features/weekly-analysis/jobs/run-weekly-analysis';
import { logServerError } from '@/security/safe-logging';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authorized(request: Request): boolean {
  const header=request.headers.get('authorization');
  const secrets=[process.env.CRON_SECRET,process.env.JOB_SECRET].filter((value):value is string=>Boolean(value));
  return secrets.some(secret=>header===`Bearer ${secret}`);
}

async function run(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers:{'Cache-Control':'no-store'} });
  try {
    const results = await runWeeklyAnalysisJob();
    return NextResponse.json({ ok: true, processed: results.length, results },{headers:{'Cache-Control':'no-store'}});
  } catch {
    const requestId = logServerError('weekly-analysis-job-failed', { endpoint: '/api/jobs/weekly-analysis' });
    return NextResponse.json({ ok: false, error: 'WEEKLY_ANALYSIS_JOB_FAILED', requestId }, { status: 500, headers:{'Cache-Control':'no-store'} });
  }
}

export const GET=run;
export const POST=run;
