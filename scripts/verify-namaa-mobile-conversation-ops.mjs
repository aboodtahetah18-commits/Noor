import fs from 'node:fs';

const root='apps/namaa-final-ui';
const workspace=`${root}/src/components/ConversationWorkspace.tsx`;
const cssPath=`${root}/src/app/globals.css`;
for(const file of [workspace,cssPath]) if(!fs.existsSync(file)) throw new Error(`Missing conversation-ops target: ${file}`);

const source=fs.readFileSync(workspace,'utf8');
const css=fs.readFileSync(cssPath,'utf8');
const checks=[
  [source.includes('القنوات التشغيلية'),'operational channel section is missing'],
  [source.includes('مجلس نماء المركزي'),'central Namaa council channel is missing'],
  [source.includes('مجلس نماء واللجان'),'council and committees channel is missing'],
  [source.includes('غرفة الميزانية'),'budget room channel is missing'],
  [source.includes('متابعة القرارات'),'decision follow-up channel is missing'],
  [source.includes('mobile-chat-actions'),'conversation action tray is missing'],
  [css.includes('/* Namaa mobile conversation operations contract */'),'conversation operations CSS contract is missing'],
  [css.includes('.mobile-channel-tag'),'channel type badges are missing'],
];
for(const [ok,message] of checks) if(!ok) throw new Error(message);
console.log('Namaa mobile conversation operations contract: OK');
