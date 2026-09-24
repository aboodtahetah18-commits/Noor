import { readFileSync } from 'node:fs';
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of ['RichStructuredMessageHero','buildRichMessageMetrics','richMessageStatus','ملخص الرسالة المنظم']){
  if(!workspace.includes(token)) throw new Error('RICH-MESSAGE-HERO-MISSING '+token);
}
for(const token of ['.richMessageHero{','.richMessageMetrics{','.richMessageEyebrow{']){
  if(!css.includes(token)) throw new Error('RICH-MESSAGE-HERO-STYLE-MISSING '+token);
}
if(workspace.includes('<Image src={room.bankLogo}')||workspace.includes('<span className={styles.richMessageWatermark}>')){
  throw new Error('RICH-MESSAGE-HERO-MUST-NOT-RENDER-BANK-IMAGE');
}
if(css.includes('.richMessageVisual{')||css.includes('.richMessageWatermark{')){
  throw new Error('RICH-MESSAGE-HERO-LEGACY-IMAGE-STYLES-PRESENT');
}
if(!css.includes('grid-template-columns:repeat(3,minmax(0,1fr))')||!css.includes('.richMessageMetrics>span:nth-child(3){grid-column:1/-1}')){
  throw new Error('RICH-MESSAGE-METRIC-LAYOUT-MISSING');
}
if(!workspace.includes("<strong>التفاصيل</strong>")){
  throw new Error('RICH-MESSAGE-MUST-SEPARATE-HERO-FROM-DETAILS');
}
console.log('RICH-STRUCTURED-MESSAGE-HERO-PASS');
