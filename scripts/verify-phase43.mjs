import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(read('package.json'));
const auth=read('src/lib/auth/http-auth.ts');
const page=read('src/app/(public)/login/page.tsx');
const migration=read('database/migrations/20260903_026_auth_account_issuer.sql');
const checks=[
  ['version is 0.43.1',pkg.version==='0.43.1'],
  ['visible version marker',page.includes('v0.43.1')],
  ['health requires issuer',auth.includes("'issuer'" )],
  ['credential insert includes issuer',auth.includes("provider_id, issuer, user_id")],
  ['credential issuer value',auth.includes("'local:credential'")],
  ['login checks issuer',auth.includes("a.issuer = 'local:credential'")],
  ['migration adds issuer',migration.includes('add column if not exists issuer text')],
  ['migration makes issuer required',migration.includes('alter column issuer set not null')],
  ['migration creates identity index',migration.includes('auth_account_issuer_account_uq')],
  ['manual Neon HTTP auth retained',auth.includes("from '@/infrastructure/db/client'")],
];
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} - ${name}`);
if(failed.length) process.exit(1);
console.log(`Phase 43 verification: PASS (${checks.length} checks)`);
