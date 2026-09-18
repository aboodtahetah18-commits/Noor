import { randomBytes, randomUUID } from 'node:crypto';
import { verifyPassword } from 'better-auth/crypto';
import { rawSql } from '@/infrastructure/db/client';
import { normalizeAuthEmail } from '@/lib/auth/http-auth';

const SESSION_DAYS = 30;

export async function signInVerifiedWithPassword(input: { email: string; password: string }) {
  const email = normalizeAuthEmail(input.email);
  const rows = await rawSql`
    select u.id, u.email, u.email_verified, a.password
    from auth."user" u
    left join auth.account a
      on a.user_id = u.id and a.provider_id = 'credential'
    where lower(u.email) = ${email}
    limit 1
  `;
  const row = rows[0];
  if (!row) return { ok: false as const, code: 'INVALID_EMAIL_OR_PASSWORD' as const };
  if (row.email_verified !== true) return { ok: false as const, code: 'EMAIL_NOT_VERIFIED' as const };
  const hash = typeof row.password === 'string' ? row.password : '';
  if (!hash) return { ok: false as const, code: 'PASSWORD_NOT_SET' as const };
  const valid = await verifyPassword({ hash, password: input.password }).catch(() => false);
  if (!valid) return { ok: false as const, code: 'INVALID_EMAIL_OR_PASSWORD' as const };

  const token = randomBytes(36).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await rawSql`
    insert into auth.session (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id)
    values (${randomUUID()}::uuid, ${expiresAt.toISOString()}::timestamptz, ${token}, now(), now(), null, null, ${String(row.id)}::uuid)
  `;
  return { ok: true as const, token, expiresAt, user: { id: String(row.id), email: String(row.email) } };
}
