import { readFileSync } from 'node:fs';
const dashboard=readFileSync('src/lib/governance/governance-oversight-dashboard.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['openDecisions','overdueFollowups','waitingUser','waitingOwner','unassigned','blocked','openEscalations','noInventedDueDates:true','noAutomaticEscalation:true','externalExecution:false']){
  if(!dashboard.includes(token)) throw new Error('GOVERNANCE-DASHBOARD-CONTRACT-MISSING '+token);
}
if(!dashboard.includes('evaluateFollowupTiming')||!dashboard.includes("institutional_decision_followup_escalation'='true'")){
  throw new Error('GOVERNANCE-DASHBOARD-MUST-USE-GOVERNED-TIMING-AND-ESCALATIONS');
}
if(!route.includes('GOVERNANCE_DASHBOARD_UNAVAILABLE')||!route.includes('isGovernanceOversightDashboardRequest')){
  throw new Error('GOVERNANCE-DASHBOARD-ROUTE-NOT-WIRED');
}
if(/update public\.budget_allocations|insert into public\.transactions|insert into public\.transfers/.test(dashboard)){
  throw new Error('GOVERNANCE-DASHBOARD-MUST-BE-READ-ONLY-FOR-FINANCIAL-STATE');
}
console.log('GOVERNANCE-OVERSIGHT-DASHBOARD-PASS');
