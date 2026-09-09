import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const must=[
 ['src/app/(protected)/bank-operations/page.tsx',['journey-strip','/merchants','/decision-log','/workspace']],
 ['src/app/(protected)/merchants/page.tsx',['/bank-operations#add-message','/decision-log','merchant-alias-list']],
 ['src/app/(protected)/internal-funding/page.tsx',['/workspace','/bank-operations#add-message','/budget/optimizer']],
 ['src/app/(protected)/budget/optimizer/page.tsx',['/workspace','/internal-funding','/budget/optimizer/review']],
 ['src/app/(protected)/reports/learning/page.tsx',['/workspace','/reports/history','/budget/optimizer']],
 ['src/app/(protected)/decision-log/page.tsx',['decision-details','/bank-operations','/workspace']],
 ['src/app/(protected)/workspace/page.tsx',['/bank-operations#add-message','/merchants','/internal-funding','/reports/learning','/decision-log']],
 ['src/app/globals.css',['P45.15 visual integration','@media(max-width:767px)','journey-strip']],
];
let failed=false;
for(const [file,tokens] of must){
 const full=path.join(root,file); const txt=fs.readFileSync(full,'utf8');
 for(const token of tokens){if(!txt.includes(token)){console.error(`FAIL ${file}: missing ${token}`);failed=true;}}
}
// All explicit internal hrefs used by audited pages should map to a route or a hash of one.
const pages=must.filter(([f])=>f.endsWith('page.tsx')).map(([f])=>f);
const hrefs=new Set();
for(const file of pages){const txt=fs.readFileSync(path.join(root,file),'utf8'); for(const m of txt.matchAll(/href=["'`]([^"'`$]+)["'`]/g)){if(m[1].startsWith('/')) hrefs.add(m[1].split('#')[0]);}}
const known=new Set(['/dashboard','/workspace','/bank-operations','/bank-statements','/merchants','/decision-log','/transactions','/budget','/budget/optimizer','/budget/optimizer/review','/internal-funding','/goals','/reports','/reports/history','/reports/learning','/settings','/cycles/new']);
for(const href of hrefs){if(!known.has(href)){console.error(`FAIL unresolved audited href: ${href}`);failed=true;}}
if(failed) process.exit(1);
console.log('P45.15 visual integration: PASS');
console.log('P45.16 journey continuity: PASS');
console.log(`Audited internal destinations: ${hrefs.size}`);
