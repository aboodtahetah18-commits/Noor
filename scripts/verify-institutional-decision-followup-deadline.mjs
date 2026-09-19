import { readFileSync } from 'node:fs';
const deadlines=readFileSync('src/lib/governance/institutional-decision-followup-deadlines.ts','utf8');
const registry=readFileSync('src/lib/governance/institutional-decision-registry.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['NO_DUE_DATE','ON_TIME','DUE_SOON','DUE_TODAY','OVERDUE','NO_DUE_SOON_WITHOUT_EXPLICIT_REMINDER_LEAD','FOLLOWUP_ESCALATION_NOT_ELIGIBLE']){
  if(!deadlines.includes(token)) throw new Error('FOLLOWUP-DEADLINE-CONTRACT-MISSING '+token);
}
if(!deadlines.includes("escalationEligible:true")||!deadlines.includes("APPROVED_DUE_DATE_PASSED")){
  throw new Error('FOLLOWUP-ESCALATION-MUST-REQUIRE-APPROVED-OVERDUE-DATE');
}
if(!registry.includes('dueDate?:string|null')||!registry.includes("institutional_decision_followup_deadline_event'='true'")){
  throw new Error('DECISION-REGISTRY-DEADLINE-OVERLAY-MISSING');
}
if(!route.includes('FOLLOWUP_DEADLINE_UNAVAILABLE')||!route.includes('parseFollowupDeadlineCommand')){
  throw new Error('FOLLOWUP-DEADLINE-ROUTE-NOT-WIRED');
}
if(/update public\.budget_allocations|insert into public\.transactions|insert into public\.transfers/.test(deadlines)){
  throw new Error('FOLLOWUP-DEADLINE-MUST-NOT-EXECUTE-OR-REALLOCATE');
}
console.log('INSTITUTIONAL-DECISION-FOLLOWUP-DEADLINE-PASS');
