import fs from 'node:fs';
const checks=[
 ['migration 056','database/migrations/20260903_056_trip_variance_learning.sql','variance_reason_code'],
 ['structured reasons','src/features/goal-events/commands/manage-goal-events.ts','TRIP_VARIANCE_REASONS'],
 ['closed-only learning','src/features/goal-events/queries/get-trip-variance-learning.ts',"e.status='CLOSED'"],
 ['benchmark-only learning','src/features/goal-events/queries/get-trip-variance-learning.ts','e.benchmark_eligible=true'],
 ['same context learning','src/features/goal-events/queries/get-trip-variance-learning.ts',"coalesce(e.trip_context_code,'STANDARD')=${context}"],
 ['no automatic mutation','PHASE_46_TRIP_VARIANCE_LEARNING_0_46_17.md','never changes the next trip plan automatically'],
 ['learning UI','src/app/(protected)/goals/[id]/page.tsx','ما الذي تكرر في الرحلات المشابهة؟'],
 ['reason selector','src/app/(protected)/goals/[id]/page.tsx','اختر سبب الزيادة'],
];
for(const [name,file,needle] of checks){const s=fs.readFileSync(file,'utf8');if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
console.log('P46.16/P46.17 structural verification: PASS');
