import { readFileSync } from 'node:fs';
const shell=readFileSync('src/app/namaa-app-shell.css','utf8');
const chat=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');
const failures=[];
const requireText=(source,text,message)=>{if(!source.includes(text))failures.push(message)};
requireText(shell,'@media (min-width:1024px)','desktop shell breakpoint missing');
requireText(shell,'@media (min-width:768px) and (max-width:1023px)','tablet shell breakpoint missing');
requireText(shell,'@media (max-width:767px)','mobile shell breakpoint missing');
requireText(shell,'.protected-app-shell:has([data-chat-first-route="true"]) {\n    width:100dvw;','chat-first mobile shell must own full viewport width');
requireText(shell,'max-width:100dvw;','chat-first mobile shell must not inherit desktop content width');
requireText(chat,'@media(min-width:768px) and (max-width:1023px){.workspace{grid-template-columns:minmax(170px,220px) minmax(390px,1fr)}','tablet workspace rules must not apply to phones');
if(chat.includes('@media(max-width:1023px){.workspace{grid-template-columns:minmax(170px,220px) minmax(390px,1fr)}'))failures.push('tablet workspace geometry is leaking into mobile');
requireText(chat,'@media (min-width:768px){','wide conversation authority missing');
requireText(chat,'width:100dvw;\n    max-width:100dvw;\n    margin:0;','mobile conversation page must fill the viewport without side whitespace');
if(failures.length){console.error('PLATFORM-LAYOUT-ISOLATION-CONTRACT-FAIL');for(const failure of failures)console.error('- '+failure);process.exit(1)}
console.log('PLATFORM-LAYOUT-ISOLATION-CONTRACT-PASS mobile/tablet/desktop geometry is independently scoped');
