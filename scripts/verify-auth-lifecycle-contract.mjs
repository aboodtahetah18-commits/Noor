import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const lifecycle = read('src/lib/auth/auth-lifecycle.ts');
const verifiedLogin = read('src/lib/auth/verified-login.ts');
const legacyRegister = read('src/app/api/auth-owner/register/route.ts');
const forgot = read('src/app/api/auth/forgot-password/route.ts');
const register = read('src/app/api/auth/register/route.ts');
const login = read('src/app/api/auth/login/route.ts');

for (const marker of [
  "createHash('sha256')",
  "delete from auth.verification",
  "expires_at > now()",
  "email_verified = true",
  "delete from auth.session",
  "'email-verification'",
  "'password-setup'",
  "'password-reset'",
]) {
  if (!lifecycle.includes(marker)) fail.push(`auth lifecycle invariant missing: ${marker}`);
}

if (!verifiedLogin.includes('row.email_verified !== true')) fail.push('verified login must reject unverified email');
if (!verifiedLogin.includes('verifyPassword')) fail.push('verified login must verify credential hash');
if (!legacyRegister.includes('AUTH_LEGACY_REGISTRATION_DISABLED') || !legacyRegister.includes('status: 410')) fail.push('legacy direct-registration endpoint must remain disabled');
if (!forgot.includes('AUTH_RESET_EMAIL_ACCEPTED')) fail.push('forgot-password route must keep a generic accepted response');
if (!register.includes('assertTrustedMutationOrigin') || !login.includes('assertTrustedMutationOrigin')) fail.push('auth mutation routes must enforce trusted origin');
if (!register.includes('enforceRateLimit') || !login.includes('enforceRateLimit')) fail.push('auth entry routes must remain rate limited');

for (const forbidden of ['console.log(input.password)', 'console.log(token)', 'value = ${token}']) {
  if (lifecycle.includes(forbidden)) fail.push(`forbidden raw secret handling detected: ${forbidden}`);
}

for (const file of [
  'src/app/(public)/register/page.tsx',
  'src/app/(public)/forgot-password/page.tsx',
  'src/app/(public)/set-password/page.tsx',
  'src/app/(public)/reset-password/page.tsx',
  'src/app/(public)/auth/error/page.tsx',
]) {
  if (!fs.existsSync(path.join(root, file))) fail.push(`missing public auth page: ${file}`);
}

if (fail.length) {
  console.error('AUTH-LIFECYCLE-CONTRACT-FAIL');
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}
console.log('AUTH-LIFECYCLE-CONTRACT-PASS');
