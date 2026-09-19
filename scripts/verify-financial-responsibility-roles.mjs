import { readFileSync } from 'node:fs';

const registry=readFileSync('src/lib/advisors/approved-advisors.ts','utf8');
const council=readFileSync('src/lib/conversations/council-deliberation-engine.ts','utf8');

const required=[
  'مسؤول الميزانية والإنفاق',
  'مسؤول الالتزامات',
  'مسؤول الأهداف',
  'مسؤول الاستثمار',
  'مسؤول السيولة والحماية',
  'المستشار الاقتصادي',
];
for(const name of required){
  if(!registry.includes(name)) throw new Error('RESPONSIBILITY-ROLE-MISSING '+name);
}
if(/مستشار المخاطر|مستشار التمويل|مستشار تشغيلي/.test(registry+council)){
  throw new Error('UNAPPROVED-ADVISOR-ROLE');
}
if(!registry.includes('mayYieldWhen')||!registry.includes('kpis')||!registry.includes('prohibited')){
  throw new Error('RESPONSIBILITY-ACCOUNTABILITY-CONTRACT-INCOMPLETE');
}
if(!council.includes('responsibility_policy')||!council.includes('accountability_boundary')){
  throw new Error('COUNCIL-RESPONSIBILITY-POLICY-NOT-ATTACHED');
}
console.log('FINANCIAL-RESPONSIBILITY-ROLES-PASS');
