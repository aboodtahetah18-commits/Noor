import fs from 'node:fs';
const intelligence=fs.readFileSync('src/features/bank-statements/services/intelligence.ts','utf8');
const page=fs.readFileSync('src/app/(protected)/bank-statements/page.tsx','utf8');
const detail=fs.readFileSync('src/app/(protected)/bank-statements/[id]/page.tsx','utf8');
const checks=[
 ['migration 034',fs.existsSync('database/migrations/20260903_034_bank_statement_quality_recurring.sql')],
 ['quality query',fs.existsSync('src/features/bank-statements/queries/get-quality-summary.ts')],
 ['fuzzy merchant matching',intelligence.includes('merchantSimilarity')&&intelligence.includes('findMerchantRule')],
 ['recurring detection',intelligence.includes('recurringSignal')],
 ['quality dashboard',page.includes('جودة الذكاء البنكي')&&page.includes('recurringCandidates')],
 ['recurring review signal',detail.includes('نمط متكرر محتمل')],
 ['version 0.44.7',JSON.parse(fs.readFileSync('package.json','utf8')).version==='0.44.7'],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`P44.7 verification: PASS (${checks.length}/${checks.length})`);
