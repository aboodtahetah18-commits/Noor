import { NextResponse } from 'next/server';
import { getServerEnv } from '@/config/env';
import { rawSql } from '@/infrastructure/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const env = getServerEnv();
    await rawSql`select 1 as ready`;
    return NextResponse.json({ status:'ready', service:'personal-finance-advisor', environment:env.APP_ENV, database:'reachable' }, { headers:{'Cache-Control':'no-store'} });
  } catch {
    return NextResponse.json({ status:'not_ready', service:'personal-finance-advisor' }, { status:503, headers:{'Cache-Control':'no-store'} });
  }
}
