import { readFileSync } from 'node:fs';

const shell=readFileSync('src/app/namaa-app-shell.css','utf8');
const chat=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');
const failures=[];
const requireText=(source,text,message)=>{if(!source.includes(text))failures.push(message)};

requireText(shell,'@media (min-width:1024px)','desktop shell breakpoint missing');
requireText(shell,'@media (min-width:768px) and (max-width:1023px)','tablet shell breakpoint missing');
requireText(shell,'@media (max-width:767px)','mobile shell breakpoint missing');
requireText(shell,'@media (max-width:1023px)','shared mobile/tablet authority missing');

requireText(
  shell,
  '.protected-app-shell:has([data-chat-first-route="true"]) {\n    width:100%!important;',
  'chat-first responsive shell must own the full available viewport width'
);
requireText(
  shell,
  '.protected-app-shell:has([data-chat-first-route="true"]) .namaa-app-main {\n    width:100%!important;\n    max-width:100%!important;',
  'chat-first responsive shell must not inherit desktop content width'
);
requireText(
  shell,
  '.protected-app-shell:has([data-chat-first-route="true"]) .namaa-page-frame,',
  'chat-first responsive page frame authority missing'
);

requireText(
  chat,
  '@media(min-width:768px) and (max-width:1023px){.workspace{grid-template-columns:minmax(170px,220px) minmax(390px,1fr)}',
  'tablet workspace rules must stay tablet-scoped'
);
if(chat.includes('@media(max-width:1023px){.workspace{grid-template-columns:minmax(170px,220px) minmax(390px,1fr)}')){
  failures.push('tablet workspace geometry is leaking into mobile');
}
requireText(chat,'@media (min-width:768px){','wide conversation authority missing');

if(failures.length){
  console.error('PLATFORM-LAYOUT-ISOLATION-CONTRACT-FAIL');
  for(const failure of failures) console.error('- '+failure);
  process.exit(1);
}
console.log('PLATFORM-LAYOUT-ISOLATION-CONTRACT-PASS shared mobile/tablet shell remains isolated from desktop geometry');
