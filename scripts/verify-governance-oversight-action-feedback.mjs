import { readFileSync } from 'node:fs';
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of [
  "type OversightActionFeedback",
  "status:'pending'",
  "status:'success'",
  "status:'error'",
  "aria-busy={isPending}",
  "oversightActionFeedback.status==='pending'",
  "لم تُغيّر البطاقة",
]){
  if(!workspace.includes(token)) throw new Error('OVERSIGHT-ACTION-FEEDBACK-MISSING '+token);
}
if(!workspace.includes("if(!command||sending||oversightActionFeedback.status==='pending')return")){
  throw new Error('OVERSIGHT-DUPLICATE-ACTION-GUARD-MISSING');
}
for(const token of ['.oversightActionSpinner{','.oversightActionFeedback{','.oversightActionSuccess{','.oversightActionError{','@media (prefers-reduced-motion:reduce)']){
  if(!css.includes(token)) throw new Error('OVERSIGHT-ACTION-FEEDBACK-STYLE-MISSING '+token);
}
console.log('GOVERNANCE-OVERSIGHT-ACTION-FEEDBACK-PASS');
