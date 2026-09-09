import { randomBytes, randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { rawSql } from '@/infrastructure/db/client';

export const AUTH_SESSION_COOKIE = 'pfa_session';
const SESSION_DAYS = 30;

export type AuthUser = { id: string; name: string; email: string | null; emailVerified: boolean; image: string | null };
export type AuthHealthCode =
  | 'AUTH_HTTP_OK'
  | 'AUTH_HTTP_DB_FAILED'
  | 'AUTH_HTTP_SCHEMA_FAILED'
  | 'AUTH_OWNER_EXISTS';

const REQUIRED_COLUMNS: Record<string, readonly string[]> = {
  user: ['id', 'name', 'email', 'email_verified', 'created_at', 'updated_at'],
  account: ['id', 'account_id', 'provider_id', 'issuer', 'user_id', 'password', 'created_at', 'updated_at'],
  session: ['id', 'expires_at', 'token', 'created_at', 'updated_at', 'user_id'],
};

export function normalizeAuthEmail(value: string): string {
  return value.trim().toLowerCase();
}

function newSessionToken(): string {
  return randomBytes(36).toString('base64url');
}

function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export async function authHealth(): Promise<{ ok: boolean; code: AuthHealthCode; detail?: string }> {
  try {
    const rows = await rawSql`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'auth'
        and table_name in ('user','account','session')
    `;
    const actual = new Map<string, Set<string>>();
    for (const row of rows) {
      const table = String(row.table_name ?? '');
      const column = String(row.column_name ?? '');
      if (!actual.has(table)) actual.set(table, new Set());
      actual.get(table)!.add(column);
    }
    for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
      const set = actual.get(table);
      if (!set) return { ok: false, code: 'AUTH_HTTP_SCHEMA_FAILED', detail: `table:${table}` };
      for (const column of columns) {
        if (!set.has(column)) return { ok: false, code: 'AUTH_HTTP_SCHEMA_FAILED', detail: `${table}.${column}` };
      }
    }
    return { ok: true, code: 'AUTH_HTTP_OK' };
  } catch {
    return { ok: false, code: 'AUTH_HTTP_DB_FAILED' };
  }
}

export async function createOwner(input: { name: string; email: string; password: string }) {
  const email = normalizeAuthEmail(input.email);
  const existing = await rawSql`select id from auth."user" limit 1`;
  if (existing.length > 0) return { ok: false as const, code: 'AUTH_OWNER_EXISTS' as const };

  const userId = randomUUID();
  const accountId = randomUUID();
  const sessionId = randomUUID();
  const token = newSessionToken();
  const expiresAt = sessionExpiry();
  const passwordHash = await hashPassword(input.password);

  try {
    await rawSql.transaction([
      rawSql`
        insert into auth."user" (id, name, email, email_verified, image, created_at, updated_at)
        values (${userId}::uuid, ${input.name.trim()}, ${email}, false, null, now(), now())
      `,
      rawSql`
        insert into auth.account (id, account_id, provider_id, issuer, user_id, password, created_at, updated_at)
        values (${accountId}::uuid, ${userId}, 'credential', 'local:credential', ${userId}::uuid, ${passwordHash}, now(), now())
      `,
      rawSql`
        insert into auth.session (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id)
        values (${sessionId}::uuid, ${expiresAt.toISOString()}::timestamptz, ${token}, now(), now(), null, null, ${userId}::uuid)
      `,
    ]);
    return { ok: true as const, token, expiresAt, user: { id: userId, email } };
  } catch (error) {
    const dbCode = typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
    const constraint = typeof error === 'object' && error && 'constraint' in error
      ? String((error as { constraint?: unknown }).constraint ?? '')
      : '';
    console.error('[auth-http-create-owner]', {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: dbCode,
      constraint,
    });
    if (dbCode === '23505') return { ok: false as const, code: 'AUTH_OWNER_EXISTS' as const };
    if (dbCode === '23502') return { ok: false as const, code: 'AUTH_SCHEMA_REQUIRED_FIELD_FAILED' as const };
    if (dbCode === '23503') return { ok: false as const, code: 'AUTH_SCHEMA_RELATION_FAILED' as const };
    return { ok: false as const, code: 'AUTH_OWNER_CREATE_FAILED' as const };
  }
}

export async function signInWithPassword(input: { email: string; password: string }) {
  const email = normalizeAuthEmail(input.email);
  const rows = await rawSql`
    select u.id, u.email, a.password
    from auth."user" u
    join auth.account a on a.user_id = u.id and a.provider_id = 'credential' and a.issuer = 'local:credential'
    where lower(u.email) = ${email}
    limit 1
  `;
  const row = rows[0];
  const hash = typeof row?.password === 'string' ? row.password : '';
  if (!row || !hash) return { ok: false as const, code: 'INVALID_EMAIL_OR_PASSWORD' as const };

  let valid = false;
  try {
    valid = await verifyPassword({ hash, password: input.password });
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false as const, code: 'INVALID_EMAIL_OR_PASSWORD' as const };

  const sessionId = randomUUID();
  const token = newSessionToken();
  const expiresAt = sessionExpiry();
  await rawSql`
    insert into auth.session (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id)
    values (${sessionId}::uuid, ${expiresAt.toISOString()}::timestamptz, ${token}, now(), now(), null, null, ${String(row.id)}::uuid)
  `;
  return { ok: true as const, token, expiresAt, user: { id: String(row.id), email: String(row.email) } };
}

export async function getUserBySessionToken(token: string): Promise<AuthUser | null> {
  if (!token) return null;
  const rows = await rawSql`
    select u.id, u.name, u.email, u.email_verified, u.image
    from auth.session s
    join auth."user" u on u.id = s.user_id
    where s.token = ${token}
      and s.expires_at > now()
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { id: String(row.id), name: String(row.name ?? ''), email: row.email == null ? null : String(row.email), emailVerified: Boolean(row.email_verified), image: row.image == null ? null : String(row.image) };
}

export async function revokeSession(token: string): Promise<void> {
  if (!token) return;
  await rawSql`delete from auth.session where token = ${token}`;
}


export async function updateOwnerAvatar(userId: string, imageDataUrl: string | null): Promise<void> {
  await rawSql`
    update auth."user"
    set image = ${imageDataUrl}, updated_at = now()
    where id = ${userId}::uuid
  `;
}

async function credentialHashForUser(userId: string): Promise<string> {
  const rows = await rawSql`
    select password
    from auth.account
    where user_id = ${userId}::uuid
      and provider_id = 'credential'
      and issuer = 'local:credential'
    limit 1
  `;
  return typeof rows[0]?.password === 'string' ? rows[0].password : '';
}

export async function changeOwnerEmail(input: { userId: string; currentPassword: string; newEmail: string }) {
  const hash = await credentialHashForUser(input.userId);
  if (!hash) return { ok: false as const, code: 'AUTH_CREDENTIAL_NOT_FOUND' as const };
  const valid = await verifyPassword({ hash, password: input.currentPassword }).catch(() => false);
  if (!valid) return { ok: false as const, code: 'INVALID_CURRENT_PASSWORD' as const };

  const newEmail = normalizeAuthEmail(input.newEmail);
  const duplicate = await rawSql`
    select id from auth."user"
    where lower(email) = ${newEmail}
      and id <> ${input.userId}::uuid
    limit 1
  `;
  if (duplicate.length) return { ok: false as const, code: 'EMAIL_ALREADY_IN_USE' as const };

  await rawSql`
    update auth."user"
    set email = ${newEmail}, email_verified = false, updated_at = now()
    where id = ${input.userId}::uuid
  `;
  return { ok: true as const, email: newEmail };
}

export async function changeOwnerPassword(input: { userId: string; currentPassword: string; newPassword: string; keepSessionToken: string }) {
  const hash = await credentialHashForUser(input.userId);
  if (!hash) return { ok: false as const, code: 'AUTH_CREDENTIAL_NOT_FOUND' as const };
  const valid = await verifyPassword({ hash, password: input.currentPassword }).catch(() => false);
  if (!valid) return { ok: false as const, code: 'INVALID_CURRENT_PASSWORD' as const };
  const newHash = await hashPassword(input.newPassword);
  await rawSql.transaction([
    rawSql`
      update auth.account
      set password = ${newHash}, updated_at = now()
      where user_id = ${input.userId}::uuid
        and provider_id = 'credential'
        and issuer = 'local:credential'
    `,
    rawSql`
      delete from auth.session
      where user_id = ${input.userId}::uuid
        and token <> ${input.keepSessionToken}
    `,
  ]);
  return { ok: true as const };
}


export type OwnerSecurityOverview = {
  emailVerified: boolean;
  activeSessionCount: number;
  otherSessionCount: number;
  currentSessionCreatedAt: string | null;
  currentSessionExpiresAt: string | null;
  passwordUpdatedAt: string | null;
};

export async function getOwnerSecurityOverview(input: { userId: string; currentSessionToken: string }): Promise<OwnerSecurityOverview> {
  const [sessionRows, credentialRows, userRows] = await Promise.all([
    rawSql`
      select token, created_at, expires_at
      from auth.session
      where user_id = ${input.userId}::uuid
        and expires_at > now()
      order by created_at desc
    `,
    rawSql`
      select updated_at
      from auth.account
      where user_id = ${input.userId}::uuid
        and provider_id = 'credential'
        and issuer = 'local:credential'
      limit 1
    `,
    rawSql`
      select email_verified
      from auth."user"
      where id = ${input.userId}::uuid
      limit 1
    `,
  ]);
  const current = sessionRows.find((row) => String(row.token ?? '') === input.currentSessionToken) ?? null;
  return {
    emailVerified: Boolean(userRows[0]?.email_verified),
    activeSessionCount: sessionRows.length,
    otherSessionCount: Math.max(0, sessionRows.length - (current ? 1 : 0)),
    currentSessionCreatedAt: current?.created_at ? new Date(String(current.created_at)).toISOString() : null,
    currentSessionExpiresAt: current?.expires_at ? new Date(String(current.expires_at)).toISOString() : null,
    passwordUpdatedAt: credentialRows[0]?.updated_at ? new Date(String(credentialRows[0].updated_at)).toISOString() : null,
  };
}

export async function revokeOtherOwnerSessions(input: { userId: string; keepSessionToken: string }): Promise<number> {
  if (!input.keepSessionToken) return 0;
  const rows = await rawSql`
    delete from auth.session
    where user_id = ${input.userId}::uuid
      and token <> ${input.keepSessionToken}
    returning id
  `;
  return rows.length;
}
