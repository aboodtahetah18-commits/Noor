import { readFileSync } from 'node:fs';
const actions=readFileSync('src/lib/governance/governance-oversight-actions.ts','utf8');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of ["key:'ESCALATE'","key:'COMPLETE'","requires_confirmation:true","confirmation_title:'تأكيد التصعيد'","confirmation_title:'تأكيد إغلاق المتابعة'"]){
  if(!actions.includes(token)) throw new Error('SENSITIVE-ACTION-METADATA-MISSING '+token);
}
for(const token of ['OversightPendingConfirmation','requestOversightCommand','confirmOversightSensitiveAction','cancelOversightSensitiveAction','role="alertdialog"','pendingOversightConfirmation']){
  if(!workspace.includes(token)) throw new Error('SENSITIVE-ACTION-CONFIRM-UI-MISSING '+token);
}
if(!workspace.includes("if(confirmation){")||!workspace.includes("void sendQuickCommand(pending.command)")){
  throw new Error('SENSITIVE-ACTION-MUST-NOT-SEND-BEFORE-EXPLICIT-CONFIRM');
}
for(const token of ['.oversightSensitiveConfirm{','.oversightSensitiveActions{','.oversightCancelButton{','.oversightConfirmButton{']){
  if(!css.includes(token)) throw new Error('SENSITIVE-ACTION-CONFIRM-STYLE-MISSING '+token);
}
console.log('GOVERNANCE-SENSITIVE-ACTION-CONFIRMATION-PASS');
