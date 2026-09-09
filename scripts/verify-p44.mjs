import fs from 'node:fs';
const checks = [
  ['migration 030', fs.existsSync('database/migrations/20260903_030_bank_statement_intelligence.sql')],
  ['CSV parser', fs.existsSync('src/features/bank-statements/services/csv-parser.ts')],
  ['import command', fs.existsSync('src/features/bank-statements/commands/import-csv.ts')],
  ['statement center', fs.existsSync('src/app/(protected)/bank-statements/page.tsx')],
  ['review page', fs.existsSync('src/app/(protected)/bank-statements/[id]/page.tsx')],
  ['settings link', fs.readFileSync('src/app/(protected)/settings/page.tsx','utf8').includes('/bank-statements')],
  ['version 0.44.7', JSON.parse(fs.readFileSync('package.json','utf8')).version==='0.44.7'],
];
let failed=0; for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
if(failed) process.exit(1); console.log(`P44 verification: PASS (${checks.length}/${checks.length})`);
