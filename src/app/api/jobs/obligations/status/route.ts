import { NextResponse } from 'next/server';
import { syncObligationStatuses } from '@/features/obligations/jobs/sync-obligation-statuses';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok:false,error:'CRON_SECRET_NOT_CONFIGURED' },{status:503});
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ ok:false,error:'UNAUTHORIZED' },{status:401});
  const result = await syncObligationStatuses();
  return NextResponse.json({ ok:true,...result });
}
