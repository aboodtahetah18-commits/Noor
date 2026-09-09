import fs from 'node:fs';
const checks=[
 ['migration 035',fs.existsSync('database/migrations/20260903_035_bank_rule_governance.sql')],
 ['rule query',fs.existsSync('src/features/bank-statements/queries/list-merchant-rules.ts')],
 ['approval modes',fs.readFileSync('database/migrations/20260903_035_bank_rule_governance.sql','utf8').includes("'AUTO','REVIEW','CONFIRM'")],
 ['safe parser retained',fs.readFileSync('src/features/bank-statements/services/file-parser.ts','utf8').includes('0.44.8-safe-capture')],
 ['decision reason',fs.readFileSync('src/features/bank-statements/services/intelligence.ts','utf8').includes('decisionReason')],
 ['rule governance action',fs.readFileSync('src/app/(protected)/bank-statements/actions.ts','utf8').includes('saveMerchantRuleGovernanceAction')],
 ['rule management UI',fs.readFileSync('src/app/(protected)/bank-statements/page.tsx','utf8').includes('القواعد المالية الذكية')],
 ['version',JSON.parse(fs.readFileSync('package.json','utf8')).version==='0.44.9'],
];
let fail=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'}: ${n}`); if(!ok)fail++;}
console.log(`P44.9 verification: ${checks.length-fail}/${checks.length} PASS`); if(fail)process.exit(1);
