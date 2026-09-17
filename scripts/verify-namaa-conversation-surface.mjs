import fs from 'node:fs';

const root='apps/namaa-final-ui';
const workspace=fs.readFileSync(`${root}/src/components/ConversationWorkspace.tsx`,'utf8');
const css=fs.readFileSync(`${root}/src/app/globals.css`,'utf8');
const checks=[
  [workspace.includes('structuredMessageKind'),'structured message classifier missing'],
  [workspace.includes('شخصية خوارزمية'),'algorithmic identity label missing'],
  [workspace.includes('تقييم مخاطر'),'risk card label missing'],
  [workspace.includes('قرار / اعتماد'),'decision card label missing'],
  [workspace.includes('توصية'),'recommendation card label missing'],
  [workspace.includes('مسار متابعة مفتوح'),'follow-up state missing'],
  [workspace.includes('مرفق للمراجعة والتحقق'),'attachment governance copy missing'],
  [workspace.includes('التنفيذ المالي الخارجي يتم بواسطة المستخدم'),'user-execution boundary missing'],
  [workspace.includes('دون استدعاء جميع الجهات تلقائيًا'),'specialist routing copy missing'],
  [css.includes('/* Namaa governed conversation surface contract */'),'conversation surface CSS marker missing'],
  [css.includes('.message-structured-card.kind-risk'),'risk card styling missing'],
  [css.includes('.conversation-execution-note'),'execution-note styling missing'],
];
for(const [ok,message] of checks) if(!ok) throw new Error(message);
console.log('Namaa governed conversation surface contract: OK');
