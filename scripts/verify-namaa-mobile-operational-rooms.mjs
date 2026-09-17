import fs from 'node:fs';

const root='apps/namaa-final-ui';
const workspace=`${root}/src/components/ConversationWorkspace.tsx`;
const cssPath=`${root}/src/app/globals.css`;
for(const file of [workspace,cssPath]) if(!fs.existsSync(file)) throw new Error(`Missing operational-room target: ${file}`);

const source=fs.readFileSync(workspace,'utf8');
const css=fs.readFileSync(cssPath,'utf8');
const checks=[
  [source.includes('roomMetaForAgent'),'room taxonomy helper is missing'],
  [source.includes('data-room-kind={roomMeta.kind}'),'room kind is not bound to chat surface'],
  [source.includes('mobile-room-meta'),'mobile room context is missing'],
  [source.includes("label:'غرفة مستشار'"),'advisor room type is missing'],
  [source.includes("label:'غرفة بنك'"),'bank room type is missing'],
  [source.includes("label:'غرفة المحافظ'"),'governor room type is missing'],
  [source.includes("label:'غرفة الأمانة'"),'secretariat room type is missing'],
  [source.includes("label:'غرفة لجنة'"),'committee room type is missing'],
  [css.includes('/* Namaa mobile operational rooms contract */'),'operational-room CSS contract is missing'],
  [css.includes(".chat-main[data-room-kind='advisor']"),'advisor room styling is missing'],
  [css.includes(".chat-main[data-room-kind='bank']"),'bank room styling is missing'],
];
for(const [ok,message] of checks) if(!ok) throw new Error(message);

console.log('Namaa mobile operational rooms contract: OK');
