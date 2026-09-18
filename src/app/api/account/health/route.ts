export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

function safeDatabaseIdentity() {
  const raw = process.env.DATABASE_URL?.trim() || '';
  if (!raw) return { configured: false, host: null, database: null };
  try {
    const url = new URL(raw);
    return {
      configured: true,
      host: url.hostname || null,
      database: url.pathname.replace(/^\//, '') || null,
    };
  } catch {
    return { configured: true, host: 'invalid-url', database: null };
  }
}

export async function GET() {
  const identity = safeDatabaseIdentity();
  const emailConfigured = Boolean(
    process.env.AUTH_EMAIL_FROM?.trim() &&
    (process.env.RESEND_API_KEY?.trim() ||
      (process.env.SMTP_USER?.trim() && process.env.SMTP_PASSWORD?.trim())),
  );

  if (!identity.configured || identity.host === 'invalid-url') {
    return NextResponse.json({
      ok: false,
      database: identity,
      emailConfigured,
      pilotMode: process.env.PILOT_MODE?.trim().toLowerCase() === 'true',
      error: 'DATABASE_URL_INVALID',
    }, { status: 503 });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  try {
    const db = await pool.query<{ current_database: string; current_user: string }>(
      'select current_database() as current_database, current_user as current_user',
    );
    const tables = await pool.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema='auth' and table_name in ('user','account','verification','user_profile','pilot_access') order by table_name",
    );
    return NextResponse.json({
      ok: true,
      database: {
        ...identity,
        connectedDatabase: db.rows[0]?.current_database ?? null,
        connectedRole: db.rows[0]?.current_user ?? null,
      },
      authTables: tables.rows.map((row) => row.table_name),
      emailConfigured,
      pilotMode: process.env.PILOT_MODE?.trim().toLowerCase() === 'true',
    });
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
    return NextResponse.json({
      ok: false,
      database: identity,
      emailConfigured,
      pilotMode: process.env.PILOT_MODE?.trim().toLowerCase() === 'true',
      error: 'DATABASE_CONNECTION_FAILED',
      databaseCode: code || null,
    }, { status: 503 });
  } finally {
    await pool.end().catch(() => undefined);
  }
}
