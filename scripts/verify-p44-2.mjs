import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const checks=[
 ['migration 031',fs.existsSync('database/migrations/20260903_031_bank_statement_learning_matching.sql')],
 ['intelligence service',read('src/features/bank-statements/services/intelligence.ts').includes('enrichStatementRows')],
 ['merchant rule application',read('src/features/bank-statements/services/intelligence.ts').includes("decisionSource='MERCHANT_RULE'")],
 ['duplicate matching',read('src/features/bank-statements/services/intelligence.ts').includes('duplicateScore')],
 ['internal transfers',read('src/features/bank-statements/services/intelligence.ts').includes("decisionSource='INTERNAL_TRANSFER'")],
 ['review action',read('src/app/(protected)/bank-statements/actions.ts').includes('reviewBankStatementRowAction')],
 ['merchant learning',read('src/app/(protected)/bank-statements/actions.ts').includes('merchant_rules')],
 ['review UI',read('src/app/(protected)/bank-statements/[id]/page.tsx').includes('قرارات تحتاجك')],
 ['version 0.44.2',JSON.parse(read('package.json')).version==='0.44.2'],
];
let pass=0; for(const [name,ok] of checks){console.log(ok?'PASS':'FAIL',name);if(ok)pass++;}
console.log(`P44.2 verification: ${pass===checks.length?'PASS':'FAIL'} (${pass}/${checks.length})`); if(pass!==checks.length)process.exit(1);
