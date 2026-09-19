import { readFileSync } from 'node:fs';
const actions=readFileSync('src/lib/governance/governance-oversight-actions.ts','utf8');
const dashboard=readFileSync('src/lib/governance/governance-oversight-dashboard.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['OPEN_FOLLOWUP','OPEN_DECISION_CONTEXT','REQUEST_USER_DATA','navigation_target','source_message_id','quick_actions','WAITING_USER','external_execution:false']){
  if(!actions.includes(token)) throw new Error('GOVERNANCE-QUICK-ACTION-CONTRACT-MISSING '+token);
}
if(!actions.includes('escalationEligible')||!actions.includes("key:'ESCALATE'")){
  throw new Error('GOVERNANCE-QUICK-ACTION-ESCALATION-GATE-MISSING');
}
if(!dashboard.includes('quickActions')||!dashboard.includes('sourceMessageId')){
  throw new Error('GOVERNANCE-DASHBOARD-QUICK-ACTIONS-NOT-EXPOSED');
}
if(!route.includes('GOVERNANCE_QUICK_ACTION_UNAVAILABLE')||!route.includes('parseOversightQuickActionCommand')){
  throw new Error('GOVERNANCE-QUICK-ACTION-ROUTE-NOT-WIRED');
}
if(/update public\.budget_allocations|insert into public\.transactions|insert into public\.transfers/.test(actions)){
  throw new Error('GOVERNANCE-QUICK-ACTIONS-MUST-NOT-EXECUTE-OR-REALLOCATE');
}
console.log('GOVERNANCE-OVERSIGHT-QUICK-ACTIONS-PASS');
