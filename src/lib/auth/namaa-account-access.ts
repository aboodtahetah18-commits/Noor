import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { Pool } from 'pg';

type ChallengeKind = 'email-verification' | 'password-setup' | 'password-reset';

type RegistrationInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
};

const CHALLENGE_TTL_MS = 30 * 60 * 1000;
let pool: Pool | null = null;

function database(): Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error('DATABASE_URL_REQUIRED');
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      options: '-c search_path=auth,public',
      max: 3,
    });
  }
  return pool;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeText(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : '';
}

function normalizePhone(value: string): string {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, '');
  let normalized = raw;
  if (digits.startsWith('966')) normalized = `+${digits}`;
  else if (digits.startsWith('05')) normalized = `+966${digits.slice(1)}`;
  else if (digits.startsWith('5') && digits.length === 9) normalized = `+966${digits}`;
  return /^\+?[1-9]\d{7,14}$/.test(normalized) ? normalized : '';
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

function challengeIdentifier(kind: ChallengeKind, email: string): string {
  return `${kind}:${normalizeEmail(email)}`;
}

function emailFromIdentifier(kind: ChallengeKind, value: string): string | null {
  const prefix = `${kind}:`;
  if (!value.startsWith(prefix)) return null;
  const email = normalizeEmail(value.slice(prefix.length));
  return email.includes('@') ? email : null;
}

export function validNamaaPassword(password: string): boolean {
  return password.length >= 10 && password.length <= 128 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

async function ensureProfileTable(): Promise<void> {
  await database().query(`
    create table if not exists auth.user_profile (
      user_id uuid primary key references auth."user"(id) on delete cascade,
      first_name text not null,
      last_name text not null,
      phone text not null,
      city text not null,
      city_normalized text not null,
      home_latitude double precision null,
      home_longitude double precision null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await database().query('create index if not exists auth_user_profile_city_idx on auth.user_profile (city_normalized)');
}

async function createChallenge(kind: ChallengeKind, email: string): Promise<string> {
  const token = newToken();
  const identifier = challengeIdentifier(kind, email);
  const value = tokenHash(token);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  const client = await database().connect();
  try {
    await client.query('begin');
    await client.query('delete from auth.verification where identifier = $1', [identifier]);
    await client.query(
      'insert into auth.verification (id, identifier, value, expires_at, created_at, updated_at) values ($1, $2, $3, $4, now(), now())',
      [randomUUID(), identifier, value, expiresAt],
    );
    await client.query('commit');
    return token;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function consumeChallenge(kind: ChallengeKind, token: string): Promise<string | null> {
  if (!token || token.length > 256) return null;
  const result = await database().query(
    'delete from auth.verification where value = $1 and identifier like $2 and expires_at > now() returning identifier',
    [tokenHash(token), `${kind}:%`],
  );
  const identifier = typeof result.rows[0]?.identifier === 'string' ? result.rows[0].identifier : '';
  return emailFromIdentifier(kind, identifier);
}

export async function beginNamaaRegistration(input: RegistrationInput) {
  const firstName = normalizeText(input.firstName, 80);
  const lastName = normalizeText(input.lastName, 80);
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const city = normalizeText(input.city, 120);

  if (!firstName || !lastName || !phone || !city || !email.includes('@') || email.length > 254) {
    return { ok: false as const, code: 'AUTH_INPUT_INVALID' as const };
  }

  await ensureProfileTable();
  const existing = await database().query(
    'select id, email_verified from auth."user" where lower(email) = $1 limit 1',
    [email],
  );
  const current = existing.rows[0];
  if (current?.email_verified === true) {
    return { ok: true as const, deliver: false as const, email };
  }

  const userId = current?.id ? String(current.id) : randomUUID();
  const fullName = `${firstName} ${lastName}`;
  const client = await database().connect();
  try {
    await client.query('begin');
    if (current) {
      await client.query(
        'update auth."user" set name = $1, updated_at = now() where id = $2 and email_verified = false',
        [fullName, userId],
      );
    } else {
      await client.query(
        'insert into auth."user" (id, name, email, email_verified, image, created_at, updated_at) values ($1, $2, $3, false, null, now(), now())',
        [userId, fullName, email],
      );
    }
    await client.query(
      `insert into auth.user_profile
        (user_id, first_name, last_name, phone, city, city_normalized, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, now(), now())
       on conflict (user_id) do update set
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         phone = excluded.phone,
         city = excluded.city,
         city_normalized = excluded.city_normalized,
         updated_at = now()`,
      [userId, firstName, lastName, phone, city, city.toLocaleLowerCase('ar')],
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  const token = await createChallenge('email-verification', email);
  return { ok: true as const, deliver: true as const, email, token };
}

export async function verifyNamaaEmail(token: string) {
  const email = await consumeChallenge('email-verification', token);
  if (!email) return { ok: false as const, code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' as const };
  const result = await database().query(
    'update auth."user" set email_verified = true, updated_at = now() where lower(email) = $1 returning id',
    [email],
  );
  if (!result.rows.length) return { ok: false as const, code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' as const };
  const setupToken = await createChallenge('password-setup', email);
  return { ok: true as const, setupToken };
}

export async function setNamaaInitialPassword(token: string, password: string) {
  if (!validNamaaPassword(password)) return { ok: false as const, code: 'AUTH_PASSWORD_WEAK' as const };
  const email = await consumeChallenge('password-setup', token);
  if (!email) return { ok: false as const, code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' as const };
  const userResult = await database().query(
    'select id from auth."user" where lower(email) = $1 and email_verified = true limit 1',
    [email],
  );
  const userId = userResult.rows[0]?.id ? String(userResult.rows[0].id) : '';
  if (!userId) return { ok: false as const, code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' as const };

  const passwordHash = await hashPassword(password);
  const client = await database().connect();
  try {
    await client.query('begin');
    await client.query("delete from auth.account where user_id = $1 and provider_id = 'credential'", [userId]);
    await client.query(
      "insert into auth.account (id, account_id, provider_id, issuer, user_id, password, created_at, updated_at) values ($1, $2, 'credential', 'local:credential', $2, $3, now(), now())",
      [randomUUID(), userId, passwordHash],
    );
    await client.query('delete from auth.session where user_id = $1', [userId]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
  return { ok: true as const };
}

export async function beginNamaaPasswordReset(emailInput: string) {
  const email = normalizeEmail(emailInput);
  if (!email.includes('@') || email.length > 254) return { ok: true as const, deliver: false as const };
  const result = await database().query(
    'select id from auth."user" where lower(email) = $1 and email_verified = true limit 1',
    [email],
  );
  if (!result.rows.length) return { ok: true as const, deliver: false as const };
  const token = await createChallenge('password-reset', email);
  return { ok: true as const, deliver: true as const, email, token };
}

export async function resetNamaaPassword(token: string, password: string) {
  if (!validNamaaPassword(password)) return { ok: false as const, code: 'AUTH_PASSWORD_WEAK' as const };
  const email = await consumeChallenge('password-reset', token);
  if (!email) return { ok: false as const, code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' as const };
  const userResult = await database().query(
    'select id from auth."user" where lower(email) = $1 and email_verified = true limit 1',
    [email],
  );
  const userId = userResult.rows[0]?.id ? String(userResult.rows[0].id) : '';
  if (!userId) return { ok: false as const, code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' as const };

  const account = await database().query(
    "select id from auth.account where user_id = $1 and provider_id = 'credential' limit 1",
    [userId],
  );
  if (!account.rows.length) return { ok: false as const, code: 'AUTH_CREDENTIAL_NOT_FOUND' as const };

  const passwordHash = await hashPassword(password);
  const client = await database().connect();
  try {
    await client.query('begin');
    await client.query(
      "update auth.account set password = $1, updated_at = now() where user_id = $2 and provider_id = 'credential'",
      [passwordHash, userId],
    );
    await client.query('delete from auth.session where user_id = $1', [userId]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
  return { ok: true as const };
}

export function accountAccessBaseUrl(): string {
  const configured = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!configured) return 'http://127.0.0.1:3000';
  return configured.startsWith('http://') || configured.startsWith('https://') ? configured : `https://${configured}`;
}

export async function sendNamaaAccountEmail(input: {
  to: string;
  kind: 'verify-email' | 'reset-password';
  url: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error('AUTH_EMAIL_NOT_CONFIGURED');

  const verify = input.kind === 'verify-email';
  const subject = verify ? 'تأكيد بريدك الإلكتروني في نماء' : 'إعادة تعيين كلمة المرور في نماء';
  const heading = verify ? 'تأكيد البريد الإلكتروني' : 'إعادة تعيين كلمة المرور';
  const intro = verify
    ? 'اضغط الرابط التالي لتأكيد بريدك ثم إنشاء كلمة المرور لأول مرة.'
    : 'وصلنا طلبًا لإعادة تعيين كلمة مرور حسابك في نماء.';
  const label = verify ? 'تأكيد البريد وإنشاء كلمة المرور' : 'إنشاء كلمة مرور جديدة';
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>${heading}</h2><p>${intro}</p><p><a href="${input.url}">${label}</a></p><p>ينتهي الرابط خلال 30 دقيقة. إذا لم تطلب هذه العملية فتجاهل الرسالة.</p></div>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [input.to], subject, html }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('AUTH_EMAIL_DELIVERY_FAILED');
}
