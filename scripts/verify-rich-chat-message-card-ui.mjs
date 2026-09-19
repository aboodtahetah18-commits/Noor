import { readFileSync } from 'node:fs';
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of ['formatConversationMessageTime','messageKindIcon','messageMeta','messageReceipt','hasLaterAgentResponse','✓✓','structuredCardHeader']){
  if(!workspace.includes(token)) throw new Error('RICH-CHAT-MESSAGE-UI-MISSING '+token);
}
if(!workspace.includes("messages.slice(messageIndex+1).some(next=>next.sender_type!=='user')")){
  throw new Error('READ-RECEIPT-MUST-BE-DERIVED-FROM-LATER-AGENT-RESPONSE');
}
for(const token of ['.messageMeta{','.messageReceiptRead{','.structuredCardHeader{','.messageCopy{']){
  if(!css.includes(token)) throw new Error('RICH-CHAT-MESSAGE-STYLE-MISSING '+token);
}
if(!css.includes('width:min(820px,92%)')||!css.includes('.agentMessage{width:94%;max-width:94%}')||!css.includes('.userMessage{max-width:80%}')){
  throw new Error('RICH-CHAT-MESSAGE-WIDTH-CONTRACT-MISSING');
}
if(!css.includes('min-height:64px')||!css.includes('width:48px')){
  throw new Error('MOBILE-CHAT-HEADER-COMPACT-CONTRACT-MISSING');
}
console.log('RICH-CHAT-MESSAGE-CARD-UI-PASS');
