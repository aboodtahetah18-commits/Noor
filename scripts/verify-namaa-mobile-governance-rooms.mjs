import fs from 'node:fs';

const root='apps/namaa-final-ui';
const workspace=`${root}/src/components/ConversationWorkspace.tsx`;
const cssPath=`${root}/src/app/globals.css`;
for(const file of [workspace,cssPath]) if(!fs.existsSync(file)) throw new Error(`Missing governance-room target: ${file}`);

const source=fs.readFileSync(workspace,'utf8');
const css=fs.readFileSync(cssPath,'utf8');
const checks=[
  [source.includes('type GovernanceRoom='),'governance room type is missing'],
  [source.includes("title:'مجلس نماء الأعلى'"),'supreme council room is missing'],
  [source.includes("title:'اللجان الدائمة'"),'standing committees room is missing'],
  [source.includes("title:'اللجان المؤقتة'"),'temporary committees room is missing'],
  [source.includes("title:'لجنة الطوارئ'"),'emergency committee room is missing'],
  [source.includes('openGovernanceRoom(room:GovernanceRoom)'),'room opener is missing'],
  [source.includes("title:governanceRoom?.title??'المحادثة الرئيسية'"),'room thread title is not persisted'],
  [source.includes('governance-chat-context'),'in-room governance context is missing'],
  [source.includes("['جدول الأعمال','المداولة','التصويت','الاعتماد','المحضر','المتابعة']"),'governance lifecycle is missing'],
  [source.includes('لا يوجد اجتماع فعلي أو تصويت مسجل'),'truthful empty-room state is missing'],
  [css.includes('/* Namaa mobile governance group rooms contract */'),'governance room CSS contract is missing'],
  [css.includes('@media(max-width:360px)'),'narrow mobile fallback is missing'],
];
for(const [ok,message] of checks) if(!ok) throw new Error(message);
console.log('Namaa mobile governance group rooms contract: OK');
