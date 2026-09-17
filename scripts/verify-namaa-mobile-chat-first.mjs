import fs from 'node:fs';

const root='apps/namaa-final-ui';
const required=[
  `${root}/src/components/LoginForm.tsx`,
  `${root}/src/app/page.tsx`,
  `${root}/src/components/ConversationWorkspace.tsx`,
  `${root}/src/app/globals.css`,
];
for(const file of required){
  if(!fs.existsSync(file)) throw new Error(`Missing chat-first target: ${file}`);
}

const login=fs.readFileSync(required[0],'utf8');
const home=fs.readFileSync(required[1],'utf8');
const chat=fs.readFileSync(required[2],'utf8');
const css=fs.readFileSync(required[3],'utf8');

const checks=[
  [login.includes('دخول إلى نماء'),'login CTA is not brand-owned'],
  [home.includes('listAgents'),'home does not load real active agents'],
  [home.includes('agents={agents as any[]}'),'agents are not passed into the conversation workspace'],
  [chat.includes('mobile-chat-inbox'),'mobile chat inbox is missing'],
  [chat.includes('جهات نماء'),'mobile Namaa contacts section is missing'],
  [chat.includes('governanceRooms')&&chat.includes('مجلس نماء الأعلى'),'governance group destination is missing'],
  [chat.includes('mobile-chat-back'),'mobile chat back navigation is missing'],
  [css.includes('/* Namaa mobile chat-first distribution contract */'),'chat-first CSS contract is missing'],
  [css.includes('grid-template-rows:auto auto minmax(0,1fr) auto'),'login full-height distribution grid is missing'],
  [css.includes('left:18px!important'),'theme control is not fixed to the visual left edge'],
  [css.includes('width:clamp(158px,44vw,188px)'),'mobile Namaa logo is not enlarged'],
  [css.includes('.mobile-chat-inbox.is-open'),'mobile inbox open state is missing'],
];
for(const [ok,message] of checks){
  if(!ok) throw new Error(message);
}

console.log('Namaa mobile chat-first + login distribution contract: OK');
