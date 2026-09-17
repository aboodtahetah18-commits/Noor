import fs from 'node:fs';

const root='apps/namaa-final-ui';
const cssPath=`${root}/src/app/globals.css`;
const workspacePath=`${root}/src/components/ConversationWorkspace.tsx`;
for(const file of [cssPath,workspacePath]) if(!fs.existsSync(file)) throw new Error(`Missing final mobile acceptance target: ${file}`);

const css=fs.readFileSync(cssPath,'utf8');
const workspace=fs.readFileSync(workspacePath,'utf8');
const marker='/* Namaa mobile final acceptance contract */';
const finalLayerStart=css.indexOf(marker);
const finalCss=finalLayerStart>=0?css.slice(finalLayerStart):'';
const checks=[
  [finalLayerStart>=0,'final acceptance marker missing'],
  [finalCss.includes('overflow-x:clip'),'mobile horizontal overflow clamp missing'],
  [finalCss.includes("[role='dialog']"),'mobile dialog viewport contract missing'],
  [finalCss.includes('env(safe-area-inset-bottom)'),'safe-area bottom protection missing'],
  [finalCss.includes('@media(max-width:320px)'),'320px contract missing'],
  [finalCss.includes('@media(max-width:360px)'),'360px contract missing'],
  [finalCss.includes('@media(max-width:430px)'),'430px contract missing'],
  [finalCss.includes('100dvh'),'dynamic viewport height contract missing'],
  [finalCss.includes('100svh'),'small viewport fallback missing'],
  [finalCss.includes('.mobile-bottom-nav'),'chat-first mobile bottom nav acceptance rule missing'],
  [finalCss.includes('.auth-page,.auth-shell'),'auth viewport contract missing'],
  [workspace.includes('governance-chat-context'),'governance chat context missing'],
];
for(const [ok,message] of checks) if(!ok) throw new Error(message);

const forbidden=[/width:\s*\d{4,}px/g,/min-width:\s*\d{4,}px/g];
for(const pattern of forbidden){
  const hits=finalCss.match(pattern)??[];
  if(hits.length) throw new Error(`oversized fixed-width declaration found in final mobile layer: ${hits[0]}`);
}

console.log('Namaa mobile final acceptance contract: OK');
