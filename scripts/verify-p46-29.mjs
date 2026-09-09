import fs from 'node:fs';
const checks=[
 ['forecast query','src/features/internal-funding/queries/get-recovery-future-forecast.ts','capacityAfterRecoveryOnly'],
 ['calendar cadence','src/features/internal-funding/queries/get-recovery-future-forecast.ts',"' month'"],
 ['read only docs','PHASE_46_RECOVERY_FUTURE_FORECAST_0_46_29.md','read-only'],
 ['no full-budget claim','PHASE_46_RECOVERY_FUTURE_FORECAST_0_46_29.md','not a full future budget forecast'],
 ['ui future impact','src/app/(protected)/internal-funding/page.tsx','أثر الاسترداد على الدورات القادمة'],
 ['forecast import','src/app/(protected)/internal-funding/page.tsx','getRecoveryFutureForecast'],
 ['forecast load','src/app/(protected)/internal-funding/page.tsx','getRecoveryFutureForecast(user.id)'],
 ['version','package.json','0.46.29'],
];
for(const [name,file,needle] of checks){const s=fs.readFileSync(file,'utf8');if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
console.log('P46.28/P46.29 structural verification: PASS');
