import fs from 'node:fs';

const cssPath='src/components/conversations/conversation-workspace.module.css';
const workspacePath='src/components/conversations/persistent-conversation-workspace.tsx';
const css=fs.readFileSync(cssPath,'utf8');
const workspace=fs.readFileSync(workspacePath,'utf8');

const failures=[];
const forbiddenCss=[
  'personaBankBadge',
  'roomDetailBankMark',
  'entityPersonaBoard',
  'entityPersonaReference',
  'Sidebar identity cards remain readable in dark mode.',
  'Governed document cleanup: remove browser markers and harden overflow.',
  'Approved persona reference strip',
];
for(const token of forbiddenCss){
  if(css.includes(token)) failures.push('legacy UI token remains: '+token);
}

const forbiddenWorkspace=[
  'styles.personaBankBadge',
  'styles.roomDetailBankMark',
  'styles.entityPersonaBoard',
  'styles.entityPersonaReference',
  'namaa-algorithmic-personas.jpg',
];
for(const token of forbiddenWorkspace){
  if(workspace.includes(token)) failures.push('legacy workspace surface remains: '+token);
}

function count(rx){ return (css.match(rx)||[]).length; }

if(count(/Final release — dark drawer identity visibility/g)!==1){
  failures.push('dark drawer final authority marker must exist exactly once');
}
if(count(/Block 3 — governed document cleanup/g)!==1){
  failures.push('governed document cleanup authority must exist exactly once');
}
if(count(/\.mobileSideSheet \.roomItemShell \.roomCopy strong\{/g)!==1){
  failures.push('dark drawer person-name rule must exist exactly once');
}
if(count(/\.mobileSideSheet \.roomItemShell \.roomCopy small/g)!==1){
  failures.push('dark drawer role/subtitle rule must exist exactly once');
}
if(!css.includes('-webkit-text-fill-color:var(--namaa-green-900)!important')){
  failures.push('dark drawer name must resist inherited text-fill overrides');
}
if(!css.includes('-webkit-text-fill-color:var(--ux-text-secondary)!important')){
  failures.push('dark drawer subtitle must resist inherited text-fill overrides');
}

const finalDark=css.indexOf('/* Final release — dark drawer identity visibility */');
const block3=css.indexOf('/* Block 3 — governed document cleanup */');
if(finalDark<0||block3<0||block3<finalDark){
  failures.push('final UI authority order is invalid');
}

if(failures.length){
  console.error('FINAL-UI-AUTHORITY-CONTRACT-FAIL');
  for(const failure of failures) console.error('- '+failure);
  process.exit(1);
}
console.log('FINAL-UI-AUTHORITY-CONTRACT-PASS');
