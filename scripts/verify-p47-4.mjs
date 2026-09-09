import fs from 'node:fs';
const checks=[
 ['budget page','src/app/(protected)/budget/page.tsx','المخطط مقابل الفعلي'],
 ['budget read model','src/features/budget/queries/get-budget-command-center.ts','OVER_BUDGET'],
 ['ledger page','src/app/(protected)/transactions/page.tsx','إضافة رسالة بنكية'],
 ['bank operations page','src/app/(protected)/bank-operations/page.tsx','ألصق رسالة البنك'],
 ['p47 css','src/app/globals.css','.p47-budget-hero'],
 ['version','package.json','0.47.4'],
];
for(const [name,file,needle] of checks){const s=fs.readFileSync(file,'utf8');if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
console.log('P47.3/P47.4 structural verification: PASS');
