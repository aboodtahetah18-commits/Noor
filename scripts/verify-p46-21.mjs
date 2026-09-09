import fs from 'node:fs';
const f='src/features/goal-events/queries/get-goal-trip-funding-timeline.ts';
const s=fs.readFileSync(f,'utf8');
const checks=[
 ['calendar month anchor','addOneMonthClamped'],
 ['no fixed 28 day cadence','28_'],
 ['goal timeline query','getGoalTripFundingTimeline'],
 ['first shortfall','firstShortfall'],
 ['uniform contribution requirement','requiredUniformContributionPerCycle'],
 ['missing target explicit','MISSING_TARGET'],
 ['missing date explicit','MISSING_DATE'],
 ['immediate shortfall explicit','periodicFundingCannotResolveImmediateShortfall'],
];
for(const [name,needle] of checks){if(name==='no fixed 28 day cadence'){if(s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name);continue;}if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
console.log('P46.20/P46.21 structural verification: PASS');
