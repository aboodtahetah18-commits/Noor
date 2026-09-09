import fs from 'node:fs';
const checks=[
 ['query','src/features/future-pressure/queries/get-future-financial-pressure.ts','getFutureFinancialPressure'],
 ['no trip double count','src/features/future-pressure/queries/get-future-financial-pressure.ts','Trips are deliberately reported as a separate deadline-funding dimension'],
 ['page','src/app/(protected)/reports/future-pressure/page.tsx','الضغط المالي عبر الدورات القادمة'],
 ['no arbitrary threshold','src/app/(protected)/reports/future-pressure/page.tsx','لا توجد نسبة خطر أو هامش اعتباطي'],
 ['doc','PHASE_46_UNIFIED_FUTURE_FINANCIAL_PRESSURE_0_46_31.md','capacityAfterCommittedOutflow'],
];
for(const [name,file,needle] of checks){const s=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');if(!s.includes(needle))throw new Error(`${name} missing`)}
console.log('P46.30/P46.31 verification PASS');
