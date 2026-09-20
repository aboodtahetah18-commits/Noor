import { readFileSync } from 'node:fs';

const registry=readFileSync('src/lib/advisors/approved-advisors.ts','utf8');
const governedRegistry=readFileSync('src/lib/governance/algorithm-role-registry.ts','utf8');
const conversations=readFileSync('src/lib/conversations/store.ts','utf8');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
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

const governedKeys=[
  'central-governor',
  'operations-center',
  'solvency-manager',
  'liquidity-protection-owner',
  'assets-manager',
  'goals-owner',
  'investment-owner',
  'hilal-manager',
  'budget-spending-owner',
  'obligations-owner',
  'economic-advisor',
  'central-secretary',
  'namaa-council',
];
for(const key of governedKeys){
  const present=key==='economic-advisor'
    ? governedRegistry.includes('key:ECONOMIC_ADVISOR.key')
    : governedRegistry.includes(`key:'${key}'`);
  if(!present) throw new Error('GOVERNED-ALGORITHM-ROLE-MISSING '+key);
}
const bankBindings=[
  ['solvency','liquidity-protection-owner'],
  ['assets','goals-owner'],
  ['assets','investment-owner'],
  ['hilal','budget-spending-owner'],
  ['hilal','obligations-owner'],
];
for(const [room,key] of bankBindings){
  const registryPattern=new RegExp(`key:'${key}'.{0,120}homeRoom:'${room}'|homeRoom:'${room}'.{0,120}key:'${key}'`,'s');
  if(!registryPattern.test(governedRegistry)||!conversations.includes(`key: '${key}'`)){
    throw new Error('RESPONSIBILITY-BANK-BINDING-MISSING '+room+' '+key);
  }
}
if(!workspace.includes("setDetailTab('team')")||!workspace.includes('الفريق والأدوار')||!workspace.includes('algorithmRolesForRoom')){
  throw new Error('MOBILE-ALGORITHM-ROLE-SURFACE-MISSING');
}
if(!governedRegistry.includes('referenceCode:')||!governedRegistry.includes('policyRefs:')){
  throw new Error('ALGORITHM-ROLE-GOVERNANCE-REFERENCE-INCOMPLETE');
}

console.log('FINANCIAL-RESPONSIBILITY-ROLES-PASS');
