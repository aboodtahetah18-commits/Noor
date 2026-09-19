import { readFileSync } from 'node:fs';
const history=readFileSync('src/lib/governance/governance-followup-history.ts','utf8');
const dashboard=readFileSync('src/lib/governance/governance-oversight-dashboard.ts','utf8');
const actions=readFileSync('src/lib/governance/governance-oversight-actions.ts','utf8');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');
for(const token of ['ASSIGNED','STATUS_CHANGED','DATA_REQUESTED','DUE_DATE_SET','REMINDER_SET','ESCALATED','COMPLETED','loadGovernanceFollowupHistories']){if(!history.includes(token))throw new Error('FOLLOWUP-HISTORY-CONTRACT-MISSING '+token)}
if(!history.includes('sender_name')||!history.includes('created_at desc'))throw new Error('FOLLOWUP-HISTORY-MUST-CARRY-ACTOR-AND-ORDER');
if(!dashboard.includes('history:GovernanceFollowupHistoryEvent[]')||!dashboard.includes('histories,'))throw new Error('DASHBOARD-HISTORY-NOT-WIRED');
if(!actions.includes('history:histories['))throw new Error('FOLLOWUP-DETAIL-HISTORY-NOT-WIRED');
for(const token of ['OversightMiniHistory','آخر التغييرات','formatOversightHistoryTime']){if(!workspace.includes(token))throw new Error('FOLLOWUP-HISTORY-UI-MISSING '+token)}
for(const token of ['.oversightHistory{','.oversightHistoryDot{']){if(!css.includes(token))throw new Error('FOLLOWUP-HISTORY-STYLE-MISSING '+token)}
console.log('GOVERNANCE-FOLLOWUP-MINI-HISTORY-PASS');
