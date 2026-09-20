import { readFileSync } from 'node:fs';
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');
for(const token of ['OversightStructuredCards','governance_oversight_dashboard','quickActions','القرار المرتبط','sendQuickCommand']){if(!workspace.includes(token))throw new Error('OVERSIGHT-CARD-UI-MISSING '+token)}
const templateHandlerStart=workspace.indexOf('onTemplate={template=>{');
const templateHandlerEnd=workspace.indexOf('/>',templateHandlerStart);
const templateHandler=templateHandlerStart>=0&&templateHandlerEnd>templateHandlerStart
  ? workspace.slice(templateHandlerStart,templateHandlerEnd)
  : '';
if(!templateHandler.includes('setDraft(template)'))throw new Error('OVERSIGHT-TEMPLATE-ACTIONS-MUST-FILL-COMPOSER');
if(!workspace.includes('onCommand={requestOversightCommand}')||!workspace.includes('void sendQuickCommand(pending.command)')||!workspace.includes('void sendQuickCommand(command)'))throw new Error('OVERSIGHT-EXPLICIT-ACTIONS-MUST-POST-THROUGH-CONVERSATION-API');
for(const token of ['.oversightPanel{','.oversightItemCard{','.oversightMeta{','.oversightActions{','.oversightActionButton{']){if(!css.includes(token))throw new Error('OVERSIGHT-CARD-STYLE-MISSING '+token)}
if((css.match(/@media\(max-width:767px\)\{/g)||[]).length!==1)throw new Error('OVERSIGHT-CARD-MUST-NOT-DUPLICATE-MOBILE-BREAKPOINT');
console.log('GOVERNANCE-OVERSIGHT-CARD-UI-PASS');
