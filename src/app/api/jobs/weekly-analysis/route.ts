import { NextResponse } from 'next/server';
import { runWeeklyAnalysisJob } from '@/features/weekly-analysis/jobs/run-weekly-analysis';
import { logServerError } from '@/security/safe-logging';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authorized(request: Request): boolean {
  const expected = process.env.JOB_SECRET;
  if (!expected) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${expected}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const results = await runWeeklyAnalysisJob();
    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch {
    const requestId = logServerError('weekly-analysis-job-failed', { endpoint: '/api/jobs/weekly-analysis' });
    return NextResponse.json({ ok: false, error: 'WEEKLY_ANALYSIS_JOB_FAILED', requestId }, { status: 500 });
  }
}
