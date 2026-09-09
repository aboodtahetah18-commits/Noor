import fs from 'node:fs';
const svc=fs.readFileSync('src/features/cycles/services/cycle-rollover-service.ts','utf8');
const checks=[
 ['migration 037',fs.existsSync('database/migrations/20260903_037_cycle_rollover.sql')],
 ['rollover service',fs.existsSync('src/features/cycles/services/cycle-rollover-service.ts')],
 ['version',JSON.parse(fs.readFileSync('package.json','utf8')).version==='0.44.14'],
 ['no fake safe to spend',svc.includes('safe_to_spend_final')&&svc.includes("safe_to_spend_status:'PENDING_BUSINESS_RULE'")],
 ['next draft cycle',svc.includes("'DRAFT'")],
 ['review close action',fs.readFileSync('src/app/(protected)/cycles/[id]/review/actions.ts','utf8').includes('closeCycleAndPrepareNextAction')]
];
for(const [n,ok] of checks)console.log(`${ok?'PASS':'FAIL'} ${n}`);
if(checks.some(([,ok])=>!ok))process.exit(1);
