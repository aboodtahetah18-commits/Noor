import fs from 'node:fs';
const files = {
  q: 'src/features/future-pressure/queries/get-pressure-decision-scenarios.ts',
  p: 'src/app/(protected)/reports/future-pressure/page.tsx',
  d: 'PHASE_46_PRESSURE_DECISION_SCENARIOS_0_46_33.md',
};
for (const [k,v] of Object.entries(files)) if (!fs.existsSync(v)) throw new Error(`missing ${k}: ${v}`);
const q=fs.readFileSync(files.q,'utf8');
const p=fs.readFileSync(files.p,'utf8');
const d=fs.readFileSync(files.d,'utf8');
const checks=[
  [q.includes('RESERVE_UNASSIGNED_GOAL_FUNDS'),'goal reserve scenario'],
  [q.includes('DEFER_TRIP_ONE_CYCLE'),'trip defer scenario'],
  [q.includes('REDUCE_GOAL_CONTRIBUTION_ONE_CYCLE'),'goal contribution scenario'],
  [q.includes('REDIRECT_CURRENT_FLEXIBLE_HEADROOM'),'flexible scenario'],
  [q.includes('timingShiftOnly'),'timing shift semantics'],
  [p.includes('سيناريوهات القرار قبل التنفيذ'),'scenario UI'],
  [p.includes('العجز الالتزامي بعد'),'before after comparison'],
  [d.includes('لا توجد أولوية آلية بين الأهداف'),'no automatic goal priority'],
  [d.includes('لا يغير التقرير أي Plan'),'read only governance'],
];
for (const [ok,label] of checks) if(!ok) throw new Error(`check failed: ${label}`);
console.log('P46.32/P46.33 verification: PASS');
