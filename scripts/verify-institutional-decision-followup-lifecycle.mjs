import { readFileSync } from 'node:fs';
const lifecycle=readFileSync('src/lib/governance/institutional-decision-followups.ts','utf8');
const registry=readFileSync('src/lib/governance/institutional-decision-registry.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['ASSIGNED','IN_PROGRESS','WAITING_USER','WAITING_OWNER','BLOCKED','COMPLETED','NO_OVERDUE_WITHOUT_APPROVED_DUE_DATE','institutional_decision_followup_event']){
  if(!lifecycle.includes(token)) throw new Error('DECISION-FOLLOWUP-CONTRACT-MISSING '+token);
}
if(!registry.includes('followupId:string')||!registry.includes("institutional_decision_followup_event'='true'")){
  throw new Error('DECISION-REGISTRY-FOLLOWUP-OVERLAY-MISSING');
}
if(!route.includes('DECISION_FOLLOWUP_UNAVAILABLE')||!route.includes('parseDecisionFollowupCommand')){
  throw new Error('DECISION-FOLLOWUP-ROUTE-NOT-WIRED');
}
if(/update public\.budget_allocations|insert into public\.transactions|insert into public\.transfers/.test(lifecycle)){
  throw new Error('DECISION-FOLLOWUP-MUST-NOT-EXECUTE-OR-REALLOCATE');
}
console.log('INSTITUTIONAL-DECISION-FOLLOWUP-LIFECYCLE-PASS');
