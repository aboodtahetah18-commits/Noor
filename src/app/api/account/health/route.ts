export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
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

function safeCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code?: unknown }).code ?? '');
    return code || null;
  }
  return null;
}

async function registrationProbe(pool: Pool) {
  let stage = 'hash-password';
  try {
    const passwordHash = await hashPassword('NamaaPilotProbe123');
    const client = await pool.connect();
    const userId = randomUUID();
    const email = `namaa-probe-${userId}@example.invalid`;

    try {
      await client.query('begin');

      stage = 'insert-user';
      await client.query(
        'insert into auth."user" (id, name, email, email_verified, image, created_at, updated_at) values ($1, $2, $3, true, null, now(), now())',
        [userId, 'Namaa Probe', email],
      );

      stage = 'insert-profile';
      await client.query(
        `insert into auth.user_profile
          (user_id, first_name, last_name, phone, city, city_normalized, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, now(), now())`,
        [userId, 'Namaa', 'Probe', '+966500000000', 'Probe City', 'probe city'],
      );

      stage = 'insert-account';
      await client.query(
        `insert into auth.account
          (id, account_id, provider_id, user_id, password, issuer, created_at, updated_at)
         values ($1, $2, 'credential', $3, $4, 'local:credential', now(), now())`,
        [randomUUID(), userId, userId, passwordHash],
      );

      stage = 'rollback';
      await client.query('rollback');
      return { ok: true, stage: 'complete' };
    } catch (error) {
      await client.query('rollback').catch(() => undefined);
      return {
        ok: false,
        stage,
        code: safeCode(error),
        errorName: error instanceof Error ? error.name : 'UnknownError',
      };
    } finally {
      client.release();
    }
  } catch (error) {
    return {
      ok: false,
      stage,
      code: safeCode(error),
      errorName: error instanceof Error ? error.name : 'UnknownError',
    };
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
    const probe = await registrationProbe(pool);

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
      registrationProbe: probe,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      database: identity,
      emailConfigured,
      pilotMode: process.env.PILOT_MODE?.trim().toLowerCase() === 'true',
      error: 'DATABASE_CONNECTION_FAILED',
      databaseCode: safeCode(error),
    }, { status: 503 });
  } finally {
    await pool.end().catch(() => undefined);
  }
}
