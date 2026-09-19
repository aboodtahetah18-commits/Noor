import { readFileSync } from 'node:fs';
const minutes=readFileSync('src/lib/allocation/allocation-decision-minutes.ts','utf8');
const finalizer=readFileSync('src/lib/allocation/allocation-final-proposal.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['participants','resolvedAgendaItems','reservations','followups','UNASSIGNED','userIsFinalDecisionMaker:true','externalExecution:false']){
  if(!minutes.includes(token)) throw new Error('DECISION-MINUTES-CONTRACT-MISSING '+token);
}
if(!finalizer.includes('ownerName:string|null')||!finalizer.includes('ownerName:item.ownerName')){
  throw new Error('FINAL-PROPOSAL-MUST-CARRY-FOLLOWUP-OWNER');
}
if(!route.includes('createRatifiedAllocationDecisionMinutes')||!route.includes('ratificationReplies')){
  throw new Error('RATIFICATION-MUST-APPEND-DECISION-MINUTES');
}
if(/insert into public\.transactions|insert into public\.transfers|update public\.budget_allocations/.test(minutes)){
  throw new Error('DECISION-MINUTES-MUST-NOT-EXECUTE-OR-REALLOCATE');
}
console.log('ALLOCATION-DECISION-MINUTES-PASS');
