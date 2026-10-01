import { readFileSync } from 'node:fs';
const shell=readFileSync('src/app/namaa-app-shell.css','utf8');
const chat=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');
const failures=[];
const requireText=(source,text,message)=>{if(!source.includes(text))failures.push(message)};
requireText(shell,'@media (min-width:768px)','tablet/stretched-tablet shell breakpoint missing');
if(shell.includes('@media (min-width:1024px)')||shell.includes('@media(min-width:1024px)'))failures.push('retired desktop shell breakpoint remains');
requireText(shell,'max-width:767px','mobile shell breakpoint missing');
requireText(shell,'.protected-app-shell:has([data-chat-first-route="true"]) {\n    width:100%;\n    max-width:100%;','chat-first shell must own the available viewport width');
requireText(shell,'.namaa-app-main {\n    width:100%;\n    max-width:100%;','chat-first main surface must not inherit a narrower content container');
requireText(chat,'@media (min-width:768px){','tablet/stretched-tablet conversation authority missing');
if(chat.includes('@media(min-width:1024px)')||chat.includes('@media (min-width:1024px)'))failures.push('retired desktop conversation breakpoint remains');
requireText(chat,'.page{\n  width:100%;\n  max-width:100%;','conversation page must fill the available width without side whitespace');
if(failures.length){console.error('PLATFORM-LAYOUT-ISOLATION-CONTRACT-FAIL');for(const failure of failures)console.error('- '+failure);process.exit(1)}
console.log('PLATFORM-LAYOUT-ISOLATION-CONTRACT-PASS mobile and tablet/stretched-tablet geometry are independently scoped');
