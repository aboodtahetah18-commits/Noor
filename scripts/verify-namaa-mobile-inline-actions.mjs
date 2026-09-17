import fs from 'node:fs';

const root='apps/namaa-final-ui';
const workspace=`${root}/src/components/ConversationWorkspace.tsx`;
const route=`${root}/src/app/api/conversations/[threadId]/messages/route.ts`;
const cssPath=`${root}/src/app/globals.css`;
for(const file of [workspace,route,cssPath]) if(!fs.existsSync(file)) throw new Error(`Missing inline-action target: ${file}`);

const source=fs.readFileSync(workspace,'utf8');
const routeSource=fs.readFileSync(route,'utf8');
const css=fs.readFileSync(cssPath,'utf8');
const checks=[
  [source.includes('StructuredActionCard'),'structured action card is missing'],
  [source.includes('sendStructuredDetails'),'structured chat form submission is missing'],
  [source.includes('AttachmentDraftReview'),'inline attachment review is missing'],
  [source.includes("a.status==='AWAITING_CONFIRMATION'"),'draft confirmation gate is missing'],
  [routeSource.includes('inlineActionForIntent'),'intent-to-action schema is missing'],
  [routeSource.includes("kind:'EVIDENCE_REQUEST'"),'evidence request action is missing'],
  [routeSource.includes("kind:'ATTACHMENT_REQUEST'"),'attachment request action is missing'],
  [routeSource.includes("kind:'MEETING_REQUEST'"),'meeting request action is missing'],
  [routeSource.includes('ui_action:inlineActionForIntent(routing.intent)'),'routing notice does not carry the inline action'],
  [css.includes('/* Namaa mobile inline conversation actions contract */'),'inline action CSS contract is missing'],
  [css.includes('.inline-chat-safety'),'no-execution safety copy styling is missing'],
  [!source.includes('executeFinancial'),'chat action must not contain direct financial execution'],
  [!routeSource.includes('executeFinancial'),'message route must not contain direct financial execution'],
];
for(const [ok,message] of checks) if(!ok) throw new Error(message);

console.log('Namaa mobile inline conversation actions contract: OK');
