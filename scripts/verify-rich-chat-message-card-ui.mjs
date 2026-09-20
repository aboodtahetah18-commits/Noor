import { readFileSync } from 'node:fs';
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of ['formatConversationMessageTime','messageKindIcon','messageMeta','messageReceipt','hasLaterAgentResponse','✓✓','structuredCardHeader']){
  if(!workspace.includes(token)) throw new Error('RICH-CHAT-MESSAGE-UI-MISSING '+token);
}
if(!/messages\.slice\(messageIndex\+1\)\.some\([^=]+=>[^\n;]*\.sender_type!=='user'\)/.test(workspace)){
  throw new Error('READ-RECEIPT-MUST-BE-DERIVED-FROM-LATER-AGENT-RESPONSE');
}
for(const token of ['.messageMeta{','.messageReceiptRead{','.structuredCardHeader{','.messageCopy{']){
  if(!css.includes(token)) throw new Error('RICH-CHAT-MESSAGE-STYLE-MISSING '+token);
}
if(!css.includes('width:min(820px,92%)')||!css.includes('width:88%')||!css.includes('max-width:88%')||!css.includes('max-width:78%')){
  throw new Error('RICH-CHAT-MESSAGE-WIDTH-CONTRACT-MISSING');
}
if(!css.includes('min-height:58px')||!css.includes('width:40px')){
  throw new Error('MOBILE-CHAT-HEADER-COMPACT-CONTRACT-MISSING');
}
console.log('RICH-CHAT-MESSAGE-CARD-UI-PASS');
