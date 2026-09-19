import { readFileSync } from 'node:fs';
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of ['RichStructuredMessageHero','buildRichMessageMetrics','richMessageStatus','room.bankLogo','/brand/namaa-leaf.webp','ملخص الرسالة المنظم']){
  if(!workspace.includes(token)) throw new Error('RICH-MESSAGE-HERO-MISSING '+token);
}
for(const token of ['.richMessageHero{','.richMessageVisual{','.richMessageMetrics{','.richMessageEyebrow{']){
  if(!css.includes(token)) throw new Error('RICH-MESSAGE-HERO-STYLE-MISSING '+token);
}
if(!css.includes('grid-template-columns:repeat(3,minmax(0,1fr))')||!css.includes('.richMessageMetrics>span:nth-child(3){grid-column:1/-1}')){
  throw new Error('RICH-MESSAGE-METRIC-LAYOUT-MISSING');
}
if(!workspace.includes("<strong>التفاصيل</strong>")){
  throw new Error('RICH-MESSAGE-MUST-SEPARATE-HERO-FROM-DETAILS');
}
console.log('RICH-STRUCTURED-MESSAGE-HERO-PASS');
