import fs from 'node:fs';
const checks=[
 ['migration 057','database/migrations/20260903_057_goal_event_funding_reservations.sql','reserved_amount'],
 ['unique event reservation','database/migrations/20260903_057_goal_event_funding_reservations.sql','unique(user_id,goal_event_id)'],
 ['readiness query','src/features/goal-events/queries/get-trip-funding-readiness.ts','requiredPerCycle'],
 ['other trip protection','src/features/goal-events/commands/manage-goal-events.ts','يتجاوز رصيد الهدف غير المحجوز للرحلات الأخرى'],
 ['explicit reservation UI','src/app/(protected)/goals/[id]/page.tsx','حفظ حجز التمويل'],
 ['no auto financial effect','PHASE_46_TRIP_FUNDING_READINESS_0_46_19.md','No bank transfer'],
];
for(const [name,file,needle] of checks){const s=fs.readFileSync(file,'utf8');if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
console.log('P46.18/P46.19 structural verification: PASS');
