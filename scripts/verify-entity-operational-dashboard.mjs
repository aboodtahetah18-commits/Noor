import { readFileSync } from 'node:fs';

const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const page=readFileSync('src/components/conversations/entity-dashboard-mobile-page.tsx','utf8');
const service=readFileSync('src/lib/conversations/entity-operational-dashboard.ts','utf8');
const weekly=readFileSync('src/features/weekly-analysis/jobs/run-weekly-analysis.ts','utf8');

function assert(condition,message){
  if(!condition) throw new Error(message);
}

assert(workspace.includes('setEntityDashboardRoom(activeRoomId)'),'ENTITY-DASHBOARD-BUTTON-MISSING');
assert(workspace.includes('aria-label="لوحة الجهة"'),'ENTITY-DASHBOARD-ACCESSIBILITY-MISSING');
assert(page.includes('الخطة الاستباقية'),'ENTITY-DASHBOARD-PROACTIVE-PLAN-MISSING');
assert(page.includes('آخر تقرير أسبوعي'),'ENTITY-DASHBOARD-WEEKLY-REPORT-MISSING');
assert(page.includes('ما الذي نحتاج فعله خلال الأسابيع والأشهر القادمة؟'),'ENTITY-DASHBOARD-WEEKLY-OUTLOOK-MISSING');
assert(page.includes('dashboard.roles.map'),'ENTITY-DASHBOARD-ROLE-SWITCHER-MISSING');
assert(service.includes('role.key===\'liquidity-protection-owner\''),'LIQUIDITY-PROACTIVE-PLAN-MISSING');
assert(service.includes('role.key===\'goals-owner\''),'GOALS-PROACTIVE-PLAN-MISSING');
assert(service.includes('role.key===\'investment-owner\''),'INVESTMENT-PROACTIVE-PLAN-MISSING');
assert(service.includes('role.key===\'budget-spending-owner\''),'BUDGET-PROACTIVE-PLAN-MISSING');
assert(service.includes('role.key===\'obligations-owner\''),'OBLIGATIONS-PROACTIVE-PLAN-MISSING');
assert(service.includes('basis:role.policyRefs'),'PROACTIVE-PLAN-POLICY-BASIS-MISSING');
assert(service.includes('بيانات التأسيس غير مكتملة بما يكفي'),'PROACTIVE-PLAN-MUST-NOT-INVENT-TARGETS');
assert(service.includes('nextPriorities'),'WEEKLY-FORWARD-PRIORITIES-MISSING');
assert(service.includes('externalExecution:false'),'ENTITY-DASHBOARD-EXECUTION-BOUNDARY-MISSING');
assert(weekly.includes('publishWeeklyEntityReports'),'WEEKLY-ENTITY-REPORT-PUBLISHER-MISSING');

console.log('ENTITY-OPERATIONAL-DASHBOARD-PASS');
