import { readFileSync } from 'node:fs';
const view=readFileSync('src/lib/governance/governance-oversight-view.ts','utf8');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of ['OVERDUE','WAITING_USER','UNASSIGNED','BLOCKED','ESCALATED','DUE_DATE','LAST_UPDATE']){
  if(!view.includes(token)) throw new Error('OVERSIGHT-VIEW-CONTRACT-MISSING '+token);
}
if(!view.includes("Number.POSITIVE_INFINITY")||!view.includes("eventTime(b)-eventTime(a)")){
  throw new Error('OVERSIGHT-VIEW-SORTING-RULES-MISSING');
}
for(const token of ['oversightViewControls','oversightFilterChips','visibleFollowups','حسب الموعد','حسب آخر تحديث']){
  if(!workspace.includes(token)) throw new Error('OVERSIGHT-VIEW-UI-MISSING '+token);
}
for(const token of ['.oversightViewControls{','.oversightFilterChips{','.oversightSortControl{','.oversightEmptyState{']){
  if(!css.includes(token)) throw new Error('OVERSIGHT-VIEW-STYLE-MISSING '+token);
}
console.log('GOVERNANCE-OVERSIGHT-FILTER-SORT-PASS');
