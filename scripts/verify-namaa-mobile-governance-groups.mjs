import fs from 'node:fs';

const root='apps/namaa-final-ui';
const page=fs.readFileSync(`${root}/src/app/page.tsx`,'utf8');
const chat=fs.readFileSync(`${root}/src/components/ConversationWorkspace.tsx`,'utf8');
const css=fs.readFileSync(`${root}/src/app/globals.css`,'utf8');
const checks=[
  [page.includes('initialGovernanceGroup'),'home does not bind governance-group context'],
  [chat.includes("id:'council',title:'مجلس نماء الأعلى'"),'council room definition missing'],
  [chat.includes("id:'standing',title:'اللجان الدائمة'"),'standing committees room missing'],
  [chat.includes("id:'temporary',title:'اللجان المؤقتة'"),'temporary committees room missing'],
  [chat.includes("id:'emergency',title:'لجنة الطوارئ'"),'emergency committee room missing'],
  [chat.includes('governanceGroupByTitle'),'persisted room restoration missing'],
  [chat.includes("coordinatorCode:'SECRETARY'"),'secretariat coordination contract missing'],
  [chat.includes('هذه غرفة تنظيمية وليست اجتماعًا فعليًا بحد ذاتها'),'synthetic-meeting safety copy missing'],
  [chat.includes('لا يُنشأ تصويت أو قرار أو محضر إلا من بيانات حقيقية'),'real-data governance safety missing'],
  [chat.includes("governanceGroupMeta?.title??'المحادثة الرئيسية'"),'group title is not persisted to thread'],
  [chat.includes('mobile-governance-index'),'governance management handoff missing'],
  [css.includes('/* Namaa mobile governance group rooms contract */'),'governance room CSS contract missing'],
  [css.includes('.governance-chat-lifecycle'),'governance lifecycle styling missing'],
];
for(const [ok,message] of checks) if(!ok) throw new Error(message);
console.log('Namaa governed mobile group rooms contract: OK');
