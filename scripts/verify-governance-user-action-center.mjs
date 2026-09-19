import { readFileSync } from 'node:fs';
const center=readFileSync('src/lib/governance/governance-user-action-center.ts','utf8');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of ["status!=='WAITING_USER'","DATA_REQUESTED","PROVIDE_REQUESTED_DATA","RESPOND_TO_FOLLOWUP","openCommand:'فتح المتابعة '"]){
  if(!center.includes(token)) throw new Error('USER-ACTION-CENTER-CONTRACT-MISSING '+token);
}
if(/WAITING_OWNER|ASSIGNED|IN_PROGRESS/.test(center.split("buildGovernanceUserActionItems")[1]??'')){
  throw new Error('USER-ACTION-CENTER-MUST-NOT-MIX-INTERNAL-OWNER-WORK');
}
for(const token of ['ما ينتظر منك','userActionItems','لا توجد إجراءات مطلوبة منك الآن','WAITING_USER']){
  if(!workspace.includes(token)) throw new Error('USER-ACTION-CENTER-UI-MISSING '+token);
}
for(const token of ['.oversightUserActionCenter{','.oversightUserActionList{','.oversightUserActionMeta{']){
  if(!css.includes(token)) throw new Error('USER-ACTION-CENTER-STYLE-MISSING '+token);
}
console.log('GOVERNANCE-USER-ACTION-CENTER-PASS');
