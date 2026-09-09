import fs from 'node:fs';
const checks=[
 ['migration 054','database/migrations/20260903_054_trip_plan_and_variance_context.sql','goal_event_category_plans'],
 ['historical seed explicit','src/features/goal-events/commands/manage-goal-events.ts','seedTripPlanFromHistory'],
 ['manual plan update','src/features/goal-events/commands/manage-goal-events.ts','updateTripCategoryPlan'],
 ['variance reason','src/features/goal-events/commands/manage-goal-events.ts','saveTripVarianceReason'],
 ['live progress query','src/features/goal-events/queries/get-trip-plan-progress.ts','needsExplanation'],
 ['ui explicit history','src/app/(protected)/goals/[id]/page.tsx','استخدام المرجع التاريخي كبداية'],
 ['no arbitrary threshold','PHASE_46_TRIP_PLANNING_AND_LIVE_PROGRESS_0_46_13.md','no arbitrary risk threshold'],
];
for(const [name,file,needle] of checks){const s=fs.readFileSync(file,'utf8');if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
console.log('P46.12/P46.13 structural verification: PASS');
