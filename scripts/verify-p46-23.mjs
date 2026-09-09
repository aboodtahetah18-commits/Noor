import fs from 'node:fs';
const checks=[
 ['migration 058','database/migrations/20260904_058_trip_gap_resolution_and_recovery_policy.sql','goal_event_id'],
 ['single active funding per trip','database/migrations/20260904_058_trip_gap_resolution_and_recovery_policy.sql','internal_funding_cases_active_goal_event_uq'],
 ['flexible proposal','database/migrations/20260904_058_trip_gap_resolution_and_recovery_policy.sql','REVISION_PENDING'],
 ['gap query','src/features/goal-events/queries/get-trip-gap-resolution.ts','FLEXIBLE'],
 ['ordered source roles','src/features/goal-events/queries/get-trip-gap-resolution.ts','EMERGENCY_FUND'],
 ['resolution command','src/features/internal-funding/commands/create-trip-gap-resolution.ts','PROPORTIONAL_ACTUAL_USE'],
 ['actual-use growth rule','PHASE_46_TRIP_GAP_RESOLUTION_AND_RECOVERY_0_46_23.md','actually allocated'],
 ['goal UI','src/app/(protected)/goals/[id]/page.tsx','حل فجوة تمويل الرحلة'],
 ['budget revision prefill','src/app/(protected)/budget/revise/page.tsx','fundingCase'],
];
for(const [n,f,x] of checks){const s=fs.readFileSync(f,'utf8');if(!s.includes(x)){console.error('FAIL',n);process.exit(1)}console.log('PASS',n)}
console.log('P46.22/P46.23 structural verification: PASS');
