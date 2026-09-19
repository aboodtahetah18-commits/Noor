import { readFileSync } from 'node:fs';
const store=readFileSync('src/lib/conversations/store.ts','utf8');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

if(!store.includes('select id,message_id,file_name,content_type,verification_status,created_at from public.conversation_attachments')){
  throw new Error('MESSAGE-LINKED-ATTACHMENTS-NOT-LOADED');
}
for(const token of ['UserMessageExtras','attachmentStatusLabel','userMessageStructuredBadges','message_id?:string|null','أُرسل للتحقق']){
  if(!workspace.includes(token)) throw new Error('COMPACT-USER-MESSAGE-UI-MISSING '+token);
}
if((workspace.match(/setAttachments\(Array\.isArray\(data\.attachments\)\?data\.attachments:\[\]\)/g)||[]).length<2){
  throw new Error('ATTACHMENTS-MUST-REFRESH-WITH-MESSAGES');
}
for(const token of ['.userMessageExtras{','.userAttachmentCard{','.userStructuredBadges{','.userMessage .messageMeta{']){
  if(!css.includes(token)) throw new Error('COMPACT-USER-MESSAGE-STYLE-MISSING '+token);
}
console.log('COMPACT-USER-MESSAGE-BUBBLE-PASS');
