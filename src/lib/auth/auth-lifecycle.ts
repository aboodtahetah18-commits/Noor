import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { rawSql } from '@/infrastructure/db/client';
import { normalizeAuthEmail } from '@/lib/auth/http-auth';

export type AuthChallengeKind = 'email-verification' | 'password-setup' | 'password-reset';
const CHALLENGE_TTL_MS = 30 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 10;

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

function identifier(kind: AuthChallengeKind, email: string): string {
  return `${kind}:${normalizeAuthEmail(email)}`;
}

function emailFromIdentifier(kind: AuthChallengeKind, value: string): string | null {
  const prefix = `${kind}:`;
  if (!value.startsWith(prefix)) return null;
  const email = normalizeAuthEmail(value.slice(prefix.length));
  return email.includes('@') ? email : null;
}

export function validNewPassword(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > 128) return false;
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

async function createChallenge(kind: AuthChallengeKind, email: string): Promise<string> {
  const normalized = normalizeAuthEmail(email);
  const token = newToken();
  const value = tokenHash(token);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  const challengeId = randomUUID();
  const key = identifier(kind, normalized);
  await rawSql.transaction([
    rawSql`delete from auth.verification where identifier = ${key}`,
    rawSql`
      insert into auth.verification (id, identifier, value, expires_at, created_at, updated_at)
      values (${challengeId}::uuid, ${key}, ${value}, ${expiresAt}::timestamptz, now(), now())
    `,
  ]);
  return token;
}

async function consumeChallenge(kind: AuthChallengeKind, token: string): Promise<string | null> {
  if (!token || token.length > 256) return null;
  const value = tokenHash(token);
  const prefix = `${kind}:%`;
  const rows = await rawSql`
    delete from auth.verification
    where value = ${value}
      and identifier like ${prefix}
      and expires_at > now()
    returning identifier
  `;
  const raw = typeof rows[0]?.identifier === 'string' ? rows[0].identifier : '';
  return emailFromIdentifier(kind, raw);
}

export async function beginRegistration(input: { name: string; email: string }) {
  const email = normalizeAuthEmail(input.email);
  const name = input.name.trim();
  if (!name || name.length > 120 || !email.includes('@') || email.length > 254) {
    return { ok: false as const, code: 'AUTH_INPUT_INVALID' as const };
  }

  const existing = await rawSql`
    select id, email_verified from auth."user" where lower(email) = ${email} limit 1
  `;
  if (existing[0]?.email_verified === true) {
    return { ok: true as const, deliver: false as const, email };
  }

  if (existing.length) {
    await rawSql`
      update auth."user" set name = ${name}, updated_at = now()
      where id = ${String(existing[0].id)}::uuid and email_verified = false
    `;
  } else {
    await rawSql`
      insert into auth."user" (id, name, email, email_verified, image, created_at, updated_at)
      values (${randomUUID()}::uuid, ${name}, ${email}, false, null, now(), now())
    `;
  }

  const token = await createChallenge('email-verification', email);
  return { ok: true as const, deliver: true as const, email, token };
}

export async function verifyEmailAndIssuePasswordSetup(token: string) {
  const email = await consumeChallenge('email-verification', token);
  if (!email) return { ok: false as const, code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' as const };

  const users = await rawSql`
    update auth."user"
    set email_verified = true, updated_at = now()
    where lower(email) = ${email}
    returning id
  `;
  if (!users.length) return { ok: false as const, code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' as const };
  const setupToken = await createChallenge('password-setup', email);
  return { ok: true as const, email, setupToken };
}

export async function setInitialPassword(input: { token: string; password: string }) {
  if (!validNewPassword(input.password)) return { ok: false as const, code: 'AUTH_PASSWORD_WEAK' as const };
  const email = await consumeChallenge('password-setup', input.token);
  if (!email) return { ok: false as const, code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' as const };

  const users = await rawSql`
    select id from auth."user" where lower(email) = ${email} and email_verified = true limit 1
  `;
  const userId = typeof users[0]?.id === 'string' ? users[0].id : '';
  if (!userId) return { ok: false as const, code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' as const };
  const passwordHash = await hashPassword(input.password);

  await rawSql.transaction([
    rawSql`
      delete from auth.account
      where user_id = ${userId}::uuid and provider_id = 'credential' and issuer = 'local:credential'
    `,
    rawSql`
      insert into auth.account (id, account_id, provider_id, issuer, user_id, password, created_at, updated_at)
      values (${randomUUID()}::uuid, ${userId}, 'credential', 'local:credential', ${userId}::uuid, ${passwordHash}, now(), now())
    `,
    rawSql`delete from auth.session where user_id = ${userId}::uuid`,
  ]);
  return { ok: true as const };
}

export async function beginPasswordReset(emailInput: string) {
  const email = normalizeAuthEmail(emailInput);
  if (!email.includes('@') || email.length > 254) return { ok: true as const, deliver: false as const };
  const users = await rawSql`
    select id from auth."user" where lower(email) = ${email} and email_verified = true limit 1
  `;
  if (!users.length) return { ok: true as const, deliver: false as const };
  const token = await createChallenge('password-reset', email);
  return { ok: true as const, deliver: true as const, email, token };
}

export async function resetPassword(input: { token: string; password: string }) {
  if (!validNewPassword(input.password)) return { ok: false as const, code: 'AUTH_PASSWORD_WEAK' as const };
  const email = await consumeChallenge('password-reset', input.token);
  if (!email) return { ok: false as const, code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' as const };

  const users = await rawSql`
    select id from auth."user" where lower(email) = ${email} and email_verified = true limit 1
  `;
  const userId = typeof users[0]?.id === 'string' ? users[0].id : '';
  if (!userId) return { ok: false as const, code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' as const };
  const passwordHash = await hashPassword(input.password);
  const accounts = await rawSql`
    select id from auth.account
    where user_id = ${userId}::uuid and provider_id = 'credential' and issuer = 'local:credential'
    limit 1
  `;
  if (!accounts.length) return { ok: false as const, code: 'AUTH_CREDENTIAL_NOT_FOUND' as const };

  await rawSql.transaction([
    rawSql`
      update auth.account set password = ${passwordHash}, updated_at = now()
      where user_id = ${userId}::uuid and provider_id = 'credential' and issuer = 'local:credential'
    `,
    rawSql`delete from auth.session where user_id = ${userId}::uuid`,
  ]);
  return { ok: true as const };
}
