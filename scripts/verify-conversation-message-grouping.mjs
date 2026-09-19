import { readFileSync } from 'node:fs';
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of ['messageGroupKey','isSameConversationGroup','shouldShowConversationTimeDivider','formatConversationTimeDivider','groupedWithPrevious','groupPosition']){
  if(!workspace.includes(token)) throw new Error('MESSAGE-GROUPING-LOGIC-MISSING '+token);
}
if(!workspace.includes("currentTime-previousTime<=5*60*1000")){
  throw new Error('MESSAGE-GROUPING-WINDOW-MUST-BE-BOUNDED');
}
if(!workspace.includes("currentTime-previousTime>=30*60*1000")){
  throw new Error('TIME-DIVIDER-GAP-CONTRACT-MISSING');
}
if(!workspace.includes("!groupedWithPrevious&&<RichStructuredMessageHero")){
  throw new Error('RICH-HERO-MUST-NOT-REPEAT-IN-CONSECUTIVE-GROUP');
}
for(const token of ['.groupContinuation{','.groupHasNext{','.conversationTimeDivider{','.messageClusterItem{']){
  if(!css.includes(token)) throw new Error('MESSAGE-GROUPING-STYLE-MISSING '+token);
}
console.log('CONVERSATION-MESSAGE-GROUPING-PASS');
