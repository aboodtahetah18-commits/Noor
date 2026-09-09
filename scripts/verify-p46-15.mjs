import fs from 'node:fs';
const checks=[
 ['migration','database/migrations/20260903_055_trip_context_reference.sql','trip_context_code'],
 ['context query','src/features/goal-events/queries/get-trip-context-history.ts','getTripContextHistoriesForCity'],
 ['context exact planner','src/features/goal-events/commands/manage-goal-events.ts',"'CITY_CONTEXT'"],
 ['fallback planner','src/features/goal-events/commands/manage-goal-events.ts',"'CITY_ONLY'"],
 ['explicit UI','src/app/(protected)/goals/[id]/page.tsx','سياق الرحلة'],
 ['reference disclosure','src/app/(protected)/goals/[id]/page.tsx','مرجع المدينة العام لعدم وجود تاريخ من نفس النوع'],
];
for(const [name,file,needle] of checks){const s=fs.readFileSync(file,'utf8');if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
console.log('P46.14/P46.15 structural verification: PASS');
