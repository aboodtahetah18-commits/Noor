export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { authHealth } from '@/lib/auth/http-auth';
import { rawSql } from '@/infrastructure/db/client';

export async function GET() {
  const health = await authHealth();
  if (!health.ok) return NextResponse.json(health, { status: 503 });
  const rows = await rawSql`select count(*)::int as owner_count from auth."user"`;
  return NextResponse.json({ ok: true, code: 'AUTH_HTTP_OK', ownerCount: Number(rows[0]?.owner_count ?? 0) });
}
