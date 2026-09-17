import fs from 'node:fs';

const root='apps/namaa-final-ui';
const cssPath=`${root}/src/app/globals.css`;
const authPath=`${root}/src/app/login/page.tsx`;
const workspacePath=`${root}/src/components/ConversationWorkspace.tsx`;
for(const file of [cssPath,authPath,workspacePath]) if(!fs.existsSync(file)) throw new Error(`Missing final mobile acceptance target: ${file}`);

const css=fs.readFileSync(cssPath,'utf8');
const auth=fs.readFileSync(authPath,'utf8');
const workspace=fs.readFileSync(workspacePath,'utf8');
const checks=[
  [css.includes('/* Namaa mobile final acceptance contract */'),'final acceptance marker missing'],
  [css.includes('overflow-x:clip'),'mobile horizontal overflow clamp missing'],
  [css.includes("[role='dialog']"),'mobile dialog viewport contract missing'],
  [css.includes('env(safe-area-inset-bottom)'),'safe-area bottom protection missing'],
  [css.includes('@media(max-width:320px)'),'320px contract missing'],
  [css.includes('@media(max-width:360px)'),'360px contract missing'],
  [css.includes('@media(max-width:430px)'),'430px contract missing'],
  [css.includes('100dvh'),'dynamic viewport height contract missing'],
  [css.includes('100svh'),'small viewport fallback missing'],
  [css.includes('.mobile-bottom-nav'),'chat-first mobile bottom nav acceptance rule missing'],
  [workspace.includes('governance-chat-context'),'governance chat context missing'],
  [auth.includes('auth-'),'auth mobile surface missing'],
];
for(const [ok,message] of checks) if(!ok) throw new Error(message);

const forbidden=[/width:\s*\d{4,}px/g,/min-width:\s*\d{4,}px/g];
for(const pattern of forbidden){
  const hits=css.match(pattern)??[];
  if(hits.length) throw new Error(`oversized fixed-width declaration found in final CSS: ${hits[0]}`);
}

console.log('Namaa mobile final acceptance contract: OK');
