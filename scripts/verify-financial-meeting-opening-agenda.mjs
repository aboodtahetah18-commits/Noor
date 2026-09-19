import { readFileSync } from 'node:fs';
const agenda=readFileSync('src/lib/allocation/financial-meeting-opening-agenda.ts','utf8');
const council=readFileSync('src/lib/conversations/council-deliberation-engine.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['BLOCKING','HIGH','requiredOutcome','expectedDecisions','openQuestions','noAutomaticDecision:true','noAutomaticAllocationChange:true','externalExecution:false']){
  if(!agenda.includes(token)) throw new Error('MEETING-AGENDA-CONTRACT-MISSING '+token);
}
if(!council.includes('meeting_opening_agenda')||!council.includes('formatMeetingOpeningAgenda')){
  throw new Error('COUNCIL-MEETING-AGENDA-NOT-WIRED');
}
if(!route.includes('MEETING_OPENING_AGENDA_UNAVAILABLE')||!route.includes('isMeetingOpeningAgendaRequest')){
  throw new Error('MEETING-AGENDA-ROUTE-NOT-WIRED');
}
if(/insert into public\.transactions|insert into public\.transfers|update public\.budget_allocations/.test(agenda)){
  throw new Error('MEETING-AGENDA-MUST-NOT-EXECUTE-OR-REALLOCATE');
}
console.log('FINANCIAL-MEETING-OPENING-AGENDA-PASS');
