import { readFileSync } from 'node:fs';
const view=readFileSync('src/lib/governance/governance-oversight-view.ts','utf8');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of ['buildOversightPriorityItems','OVERDUE','ESCALATED','BLOCKED','UNASSIGNED','متأخرة عن موعد معتمد','لها تصعيد مفتوح','معلّقة بمانع قائم','غير مسندة لمسؤول']){
  if(!view.includes(token)) throw new Error('OVERSIGHT-PRIORITY-RULE-MISSING '+token);
}
if(/score|weight|points|نقاط|أوزان/.test(view)){
  throw new Error('OVERSIGHT-PRIORITY-MUST-NOT-USE-INVENTED-SCORING');
}
for(const token of ['الأولوية الآن','priorityItems.slice(0,4)','setViewFilter(reason.filter)','oversightPriorityPolicy']){
  if(!workspace.includes(token)) throw new Error('OVERSIGHT-PRIORITY-UI-MISSING '+token);
}
for(const token of ['.oversightPriorityNow{','.oversightPriorityList{','.oversightPriorityReasons{']){
  if(!css.includes(token)) throw new Error('OVERSIGHT-PRIORITY-STYLE-MISSING '+token);
}
console.log('GOVERNANCE-OVERSIGHT-PRIORITY-NOW-PASS');
