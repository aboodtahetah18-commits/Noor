import { readFileSync } from 'node:fs';

const registry=readFileSync('src/lib/advisors/approved-advisors.ts','utf8');
const governedRegistry=readFileSync('src/lib/governance/algorithm-role-registry.ts','utf8');
const conversations=readFileSync('src/lib/conversations/store.ts','utf8');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const dashboardPage=readFileSync('src/components/conversations/entity-dashboard-mobile-page.tsx','utf8');
const dashboardEngine=readFileSync('src/lib/conversations/entity-operational-dashboard.ts','utf8');
const weeklyJob=readFileSync('src/features/weekly-analysis/jobs/run-weekly-analysis.ts','utf8');
const weeklyRoute=readFileSync('src/app/api/jobs/weekly-analysis/route.ts','utf8');
const vercelConfig=readFileSync('vercel.json','utf8');
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


if(!workspace.includes('aria-label="لوحة الجهة"')||!workspace.includes('EntityDashboardMobilePage')){
  throw new Error('MOBILE-ENTITY-DASHBOARD-ACTION-MISSING');
}
if(!dashboardPage.includes('الخطة الاستباقية')||!dashboardPage.includes('آخر تقرير أسبوعي')||!dashboardPage.includes('الفريق المسؤول')){
  throw new Error('MOBILE-ENTITY-DASHBOARD-SECTIONS-MISSING');
}
for(const key of ['liquidity-protection-owner','goals-owner','investment-owner','budget-spending-owner','obligations-owner']){
  if(!dashboardEngine.includes(`role.key==='${key}'`)) throw new Error('PROACTIVE-ROLE-PLAN-MISSING '+key);
}
if(!dashboardEngine.includes('publishWeeklyEntityReports')||!weeklyJob.includes('publishWeeklyEntityReports(userId,periodStart)')){
  throw new Error('WEEKLY-ENTITY-REPORT-PUBLISHING-MISSING');
}
if(!weeklyRoute.includes('export const GET=run')||!weeklyRoute.includes('process.env.CRON_SECRET')){
  throw new Error('WEEKLY-ANALYSIS-CRON-ROUTE-MISSING');
}
if(!vercelConfig.includes('/api/jobs/weekly-analysis')||!vercelConfig.includes('"deploymentEnabled": false')){
  throw new Error('WEEKLY-ANALYSIS-SCHEDULE-OR-DEPLOYMENT-GUARD-MISSING');
}

console.log('FINANCIAL-RESPONSIBILITY-ROLES-PASS');
