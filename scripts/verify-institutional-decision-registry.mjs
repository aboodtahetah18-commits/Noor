import { readFileSync } from 'node:fs';
const registry=readFileSync('src/lib/governance/institutional-decision-registry.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['ALLOCATION','PLAN_DEVIATION','CYCLE_CLOSURE','FOLLOWUP_PENDING','CLOSED','APPEND_ONLY_DECISION_MESSAGES','externalExecution:false']){
  if(!registry.includes(token)) throw new Error('DECISION-REGISTRY-CONTRACT-MISSING '+token);
}
if(!registry.includes("allocation_decision_minutes'='true'")||!registry.includes("deviation_resolution'='true'")||!registry.includes("cycle_closure_approved'='true'")){
  throw new Error('DECISION-REGISTRY-SOURCES-INCOMPLETE');
}
if(/update public\.budget_allocations|insert into public\.transactions|insert into public\.transfers/.test(registry)){
  throw new Error('DECISION-REGISTRY-MUST-BE-READ-ONLY-FOR-FINANCIAL-STATE');
}
if(!route.includes('DECISION_REGISTRY_UNAVAILABLE')||!route.includes('createInstitutionalDecisionRegistryReply')){
  throw new Error('DECISION-REGISTRY-ROUTE-NOT-WIRED');
}
console.log('INSTITUTIONAL-DECISION-REGISTRY-PASS');
