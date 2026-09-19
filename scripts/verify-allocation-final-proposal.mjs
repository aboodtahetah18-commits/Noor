import { readFileSync } from 'node:fs';
const finalizer=readFileSync('src/lib/allocation/allocation-final-proposal.ts','utf8');
const ratification=readFileSync('src/lib/allocation/allocation-ratification.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['BLOCKED_BY_AGENDA','NEGOTIATION_NOT_READY','resolvedAgendaItems','nonBlockingFollowups','ratificationReady:true','externalExecution:false']){
  if(!finalizer.includes(token)) throw new Error('FINAL-PROPOSAL-CONTRACT-MISSING '+token);
}
if(!ratification.includes("allocation_final_proposal'='true'")||!ratification.includes("ratification_ready'='true'")){
  throw new Error('RATIFICATION-MUST-REQUIRE-FINAL-PROPOSAL');
}
if(!ratification.includes('agenda_tracking_state')||!ratification.includes('non_blocking_followups')){
  throw new Error('RATIFICATION-MUST-CARRY-MEETING-RECORD');
}
if(!route.includes('NO_RATIFIABLE_ALLOCATION_PROPOSAL')||!route.includes('isAllocationFinalProposalRequest')){
  throw new Error('FINAL-PROPOSAL-ROUTE-NOT-WIRED');
}
if(/update public\.budget_allocations|insert into public\.transactions|insert into public\.transfers/.test(finalizer)){
  throw new Error('FINAL-PROPOSAL-MUST-NOT-EXECUTE-OR-REALLOCATE');
}
console.log('ALLOCATION-FINAL-PROPOSAL-PASS');
