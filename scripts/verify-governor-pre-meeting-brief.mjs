import { readFileSync } from 'node:fs';
const brief=readFileSync('src/lib/allocation/governor-pre-meeting-brief.ts','utf8');
const council=readFileSync('src/lib/conversations/council-deliberation-engine.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['priorExceededOwners','priorUnusedOwners','currentMissingEvidenceOwners','requestDeltaFromPreviousApproved','noAutomaticDecision:true','noAutomaticScore:true','noAutomaticAmountAdjustment:true']){
  if(!brief.includes(token)) throw new Error('GOVERNOR-BRIEF-CONTRACT-MISSING '+token);
}
if(!council.includes('governor_pre_meeting_brief')||!council.includes('getGovernorPreMeetingBrief')){
  throw new Error('COUNCIL-GOVERNOR-BRIEF-NOT-WIRED');
}
if(!route.includes('GOVERNOR_PRE_MEETING_BRIEF_UNAVAILABLE')||!route.includes('isGovernorPreMeetingBriefRequest')){
  throw new Error('CENTRAL-GOVERNOR-BRIEF-ROUTE-NOT-WIRED');
}
if(/performanceScore|score:\s*\d|automatic_amount_adjustment:true/.test(brief+council)){
  throw new Error('GOVERNOR-BRIEF-MUST-NOT-INVENT-SCORE-OR-AUTO-AMOUNT');
}
console.log('GOVERNOR-PRE-MEETING-BRIEF-PASS');
