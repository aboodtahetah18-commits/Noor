import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const pkg=JSON.parse(read('package.json'));
const page=read('src/app/(protected)/onboarding/accounts/page.tsx');
const schema=read('src/features/accounts/schemas/account.ts');
const repo=read('src/repositories/account-repository.ts');
const migration=read('database/migrations/20260903_027_account_financial_identity.sql');
const checks=[
 ['version',pkg.version==='0.43.3'],
 ['money-location onboarding',page.includes('أين توجد أموالك الآن؟')],
 ['bank selector',page.includes('BANK_OPTIONS')],
 ['27 Aug default',page.includes('2026-08-27')],
 ['iban validation',schema.includes('^SA\\d{22}$')],
 ['card last4 only',schema.includes('^\\d{4}$')],
 ['identity insert',repo.includes('bank_code,bank_name,account_number,iban,card_last4')],
 ['masked read model',repo.includes('ibanMasked') && repo.includes('accountNumberMasked')],
 ['migration 027',migration.includes('add column if not exists iban')],
 ['iban uniqueness',migration.includes('accounts_user_iban_uq')],
];
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} - ${name}`);if(!ok)process.exitCode=1;}
if(!process.exitCode)console.log(`P43 account identity verification: PASS (${checks.length}/${checks.length})`);
