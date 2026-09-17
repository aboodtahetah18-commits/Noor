import fs from 'node:fs';

const root='apps/namaa-final-ui';
const workspacePath=`${root}/src/components/ConversationWorkspace.tsx`;
const repositoryPath=`${root}/src/lib/conversations/repository.ts`;
const messageRoutePath=`${root}/src/app/api/conversations/[threadId]/messages/route.ts`;
const cssPath=`${root}/src/app/globals.css`;

for(const file of [workspacePath,repositoryPath,messageRoutePath,cssPath]){
  if(!fs.existsSync(file)) throw new Error(`Missing operational-group target: ${file}`);
}

const workspace=fs.readFileSync(workspacePath,'utf8');
const repository=fs.readFileSync(repositoryPath,'utf8');
const messageRoute=fs.readFileSync(messageRoutePath,'utf8');
const css=fs.readFileSync(cssPath,'utf8');

const checks=[
  [workspace.includes('const operationalGroups:OperationalGroup[]'),'operational group directory is missing'],
  [workspace.includes("threadKind:'GROUP_GOVERNANCE'"),'governance group thread kind is missing'],
  [workspace.includes("threadKind:'GROUP_BANK'"),'bank group thread kind is missing'],
  [workspace.includes("conversation_mode:'GROUP'"),'group conversation context is missing'],
  [workspace.includes('member_agent_codes:selectedGroup.memberAgentCodes'),'group participant context is missing'],
  [workspace.includes('function openGroup(group:OperationalGroup)'),'group open action is missing'],
  [workspace.includes("selectedGroup?'سياق جماعي محكوم':'سياق مالي آمن'"),'governed group context label is missing'],
  [workspace.includes('groupQuickPrompts'),'group quick prompts are missing'],
  [workspace.includes('mobile-group-members'),'group member strip is missing'],
  [repository.includes('        t.context,\n        t.updated_at,'),'thread context is not listed for inbox reconstruction'],
  [messageRoute.includes("const isOperationalGroup=String(thread.thread_kind??'').startsWith('GROUP_') || threadContext.conversation_mode==='GROUP';"),'group route guard is missing'],
  [messageRoute.includes('if(targetAgent && !isOperationalGroup'),'group routing can still mutate room identity'],
  [css.includes('/* Namaa mobile operational groups contract */'),'operational-group CSS contract is missing'],
  [css.includes('.mobile-group-badge'),'group badge styling is missing'],
];

for(const [ok,message] of checks){
  if(!ok) throw new Error(message);
}

const forbidden=[
  'عدد الأصوات التجريبي',
  'اجتماع تجريبي',
  'mock meeting',
  'fake meeting',
];
for(const token of forbidden){
  if(workspace.toLowerCase().includes(token.toLowerCase())) throw new Error(`Forbidden invented governance data found: ${token}`);
}

console.log('Namaa mobile operational groups contract: OK');
