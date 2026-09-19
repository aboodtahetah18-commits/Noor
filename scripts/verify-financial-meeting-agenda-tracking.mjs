import { readFileSync } from 'node:fs';
const tracking=readFileSync('src/lib/allocation/financial-meeting-agenda-tracking.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['OPEN','NEEDS_DATA','REFERRED','READY_FOR_DECISION','RESOLVED','blockingOpenCount','canCloseMeeting','meeting_close_blocked']){
  if(!tracking.includes(token)) throw new Error('MEETING-AGENDA-TRACKING-CONTRACT-MISSING '+token);
}
if(!tracking.includes("priority==='BLOCKING'&&item.status!=='RESOLVED'")){
  throw new Error('MEETING-CLOSE-MUST-BLOCK-ON-UNRESOLVED-BLOCKERS');
}
if(/update public\.budget_allocations|insert into public\.transactions|insert into public\.transfers/.test(tracking)){
  throw new Error('MEETING-AGENDA-TRACKING-MUST-NOT-EXECUTE-OR-REALLOCATE');
}
if(!route.includes('NO_MEETING_AGENDA_TO_TRACK')||!route.includes('parseMeetingAgendaCommand')){
  throw new Error('MEETING-AGENDA-TRACKING-ROUTE-NOT-WIRED');
}
console.log('FINANCIAL-MEETING-AGENDA-TRACKING-PASS');
