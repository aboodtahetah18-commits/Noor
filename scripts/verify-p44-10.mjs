import fs from 'node:fs';
const checks=[
 ['version',fs.readFileSync('package.json','utf8').includes('0.44.12')],
 ['migration',fs.existsSync('database/migrations/20260903_036_cycle_monthly_review.sql')],
 ['review query',fs.existsSync('src/features/cycles/queries/get-cycle-monthly-review.ts')],
 ['review page',fs.existsSync('src/app/(protected)/cycles/[id]/review/page.tsx')],
 ['review action',fs.existsSync('src/app/(protected)/cycles/[id]/review/actions.ts')],
 ['parser regression guard',fs.readFileSync('src/features/bank-statements/services/file-parser.ts','utf8').includes('0.44.8-safe-capture')],
];
for(const [n,ok] of checks)console.log(`${ok?'PASS':'FAIL'} ${n}`);
if(checks.some(([,ok])=>!ok))process.exit(1);
console.log(`P44.10 verification: PASS ${checks.length}/${checks.length}`);
