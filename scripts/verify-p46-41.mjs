import fs from 'node:fs';
const checks=[
 ['migration','database/migrations/20260904_064_pressure_decision_learning.sql','CO_OCCURRENCE'],
 ['record','src/features/future-pressure/commands/record-pressure-decision-learning.ts','recordPressureDecisionLearning'],
 ['no causal claim','src/features/future-pressure/commands/record-pressure-decision-learning.ts','لا تثبت أنه السبب المنفرد'],
 ['query','src/features/future-pressure/queries/get-pressure-decision-learning.ts','getPressureDecisionLearning'],
 ['ui','src/app/(protected)/reports/future-pressure/page.tsx','ما تعلّمه النظام من قراراتك'],
 ['hook','src/features/future-pressure/commands/manage-pressure-decision-packages.ts','recordPressureDecisionLearning'],
];
for(const [n,f,x] of checks){if(!fs.readFileSync(f,'utf8').includes(x))throw new Error(`FAIL ${n}`);console.log('PASS',n)}
console.log('P46.40/P46.41 structural verification: PASS');
