import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const fail=(m)=>{console.error(`P61-FAIL ${m}`);process.exitCode=1};
const pass=(m)=>console.log(`PASS ${m}`);
const atLeast=(version,major,minor,patch)=>{const [a=0,b=0,c=0]=version.split('.').map(Number);if(a!==major)return a>major;if(b!==minor)return b>minor;return c>=patch};
const pkg=JSON.parse(read('package.json'));
if(atLeast(pkg.version,1,2,0))pass(`P61 version — ${pkg.version}`);else fail(`version ${pkg.version} is older than 1.2.0`);
if(pkg.scripts?.['verify:p61']==='node scripts/verify-p61.mjs')pass('P61 verification command');else fail('P61 verification command missing');
const auth=read('src/lib/auth/http-auth.ts');
for(const token of ['OwnerSecurityOverview','getOwnerSecurityOverview','revokeOtherOwnerSessions','expires_at > now()','token <> ${input.keepSessionToken}']){if(auth.includes(token))pass(`security runtime ${token}`);else fail(`security runtime missing ${token}`)}
const actions=read('src/app/(protected)/settings/actions.ts');
for(const token of ['removeAvatarAction','revokeOtherSessionsAction','profile-session-revoke','profile-avatar-remove','AUTH_SESSION_COOKIE']){if(actions.includes(token))pass(`security action ${token}`);else fail(`security action missing ${token}`)}
const page=read('src/app/(protected)/settings/page.tsx');
for(const token of ['أمان الحساب','الجلسات النشطة','انتهاء الجلسة الحالية','آخر تحديث لكلمة المرور','تسجيل الخروج من الجلسات الأخرى','إزالة صورة الحساب']){if(page.includes(token))pass(`settings security UI ${token}`);else fail(`settings security UI missing ${token}`)}
const gate=read('scripts/production-quality-gate.mjs');
if(gate.includes("['P61 smart profile and security operations','node',['scripts/verify-p61.mjs']]"))pass('P61 wired first in quality gate');else fail('P61 quality-gate wiring missing');
const migrations=fs.readdirSync(path.join(root,'database/migrations')).filter((n)=>n.endsWith('.sql'));
if(migrations.length===66)pass('migration inventory — 66');else fail(`migration inventory expected 66 got ${migrations.length}`);
if(process.exitCode)process.exit(process.exitCode);
console.log('P61 smart profile and security operations contract: PASS');
