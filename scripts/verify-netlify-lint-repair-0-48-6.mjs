import fs from 'node:fs';

const checks = [
  ['expenses uses Next Link', 'src/app/(protected)/expenses/page.tsx', "import Link from 'next/link';"],
  ['cycles new uses Link', 'src/app/(protected)/expenses/page.tsx', 'href="/cycles/new"'],
  ['bank operations uses Link', 'src/app/(protected)/expenses/page.tsx', 'href="/bank-operations#add-message"'],
  ['db explicit callable', 'src/infrastructure/db/client.ts', '(...params: unknown[]) => unknown'],
  ['db Reflect.get without any proxy indexing', 'src/infrastructure/db/client.ts', 'Reflect.get(client as object, prop)'],
  ['bootstrap Next router', 'src/app/(public)/login/bootstrap-owner-form.tsx', "router.replace('/onboarding')"],
  ['version', 'package.json', '0.48.6'],
];
for (const [name,file,needle] of checks) {
  const text=fs.readFileSync(file,'utf8');
  if(!text.includes(needle)){console.error('FAIL',name);process.exit(1)}
  console.log('PASS',name);
}
const expense=fs.readFileSync('src/app/(protected)/expenses/page.tsx','utf8');
if(/<a[^>]+href="\/(cycles\/new|bank-operations)/.test(expense)){console.error('FAIL internal anchor remains');process.exit(1)}
const db=fs.readFileSync('src/infrastructure/db/client.ts','utf8');
if(/\bas unknown as Function\b|:\s*Function\b/.test(db)){console.error('FAIL unsafe Function type remains');process.exit(1)}
const funding=fs.readFileSync('src/app/(protected)/internal-funding/page.tsx','utf8');
if(/const\s+categoryCapacity\b/.test(funding)){console.error('FAIL categoryCapacity warning remains');process.exit(1)}
const bootstrap=fs.readFileSync('src/app/(public)/login/bootstrap-owner-form.tsx','utf8');
if(bootstrap.includes("window.location.assign('/onboarding')")){console.error('FAIL internal window navigation remains');process.exit(1)}
const report=fs.readFileSync('src/repositories/report-repository.ts','utf8');
if(report.includes('calculatePercentage')||report.includes('function nonNegative')){console.error('FAIL report unused symbols remain');process.exit(1)}
console.log('Netlify lint repair 0.48.6: PASS');
