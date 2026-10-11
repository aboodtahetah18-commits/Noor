import { readFileSync } from 'node:fs';

const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const personaAssets=readFileSync('src/components/conversations/persona-assets.ts','utf8');
const failures=[];

function requireText(source,needle,message){
  if(!source.includes(needle)) failures.push(message);
}
function forbid(source,re,message){
  if(re.test(source)) failures.push(message);
}

requireText(css,'MOBILE/TABLET CHAT-FIRST FINAL AUTHORITY','final mobile/tablet chat authority marker is missing');
requireText(css,'.page{\n  width:100%!important;\n  max-width:100%!important;','chat page must own the available width');
requireText(css,'.workspace{\n  display:block!important;','chat workspace must use the final single-surface composition');
forbid(workspace,/styles\\.(?:roomsPane|contextPane)\\b/,'retired desktop room/context rails must stay hidden');
requireText(css,'.chatPane{\n  display:flex!important;\n  flex-direction:column!important;','chat pane must remain a vertical full-height surface');
forbid(workspace,/styles\\.desktopChatHeaderForeground\\b/,'desktop chat header must remain retired');
requireText(css,'.chatHeaderForeground{\n  display:flex!important;','mobile/tablet header must remain the active header');
requireText(css,'.chatHeaderForeground .mobileTools{\n  margin-inline-start:auto!important;','header utilities must stay on the far RTL-opposite edge');
requireText(css,'flex:1 1 0!important;','message pane must consume remaining height');
requireText(css,'overflow-y:auto!important;','message pane must own vertical scrolling');
requireText(css,'position:sticky!important;\n  bottom:0!important;\n  inset-block-end:0!important;\n  z-index:20!important;\n  display:flex!important;\n  direction:rtl!important;','composer must remain RTL and anchored below the scroll pane');
requireText(css,'env(safe-area-inset-bottom)','composer/overlay surfaces must preserve device safe area');
requireText(css,'@media (min-width:768px){','tablet/stretched-tablet authority is missing');
forbid(css,/@media\s*\([^)]*min-width\s*:\s*(?:1024|1440)px/i,'retired desktop chat breakpoint was reintroduced');

requireText(workspace,'/brand/ndos/namaa-logo-color-transparent.png','official color Namaa logo is missing');
requireText(workspace,'/brand/ndos/namaa-logo-white-transparent.png','official white Namaa logo is missing');
forbid(workspace,/mobileBrandLockup/,'Namaa logo must not be redrawn from text and symbol');
forbid(css,/filter\s*:\s*(?:brightness|invert|hue-rotate|sepia|saturate)/i,'approved brand imagery must not be recolored with CSS filters');

requireText(css,'.onboardingIntake','onboarding intake surface is missing');
requireText(css,'position:fixed','onboarding and local surfaces must remain focused overlay layers');
requireText(css,'.onboardingCloseButton','onboarding close control is missing');
requireText(css,'.inlineIntakeButton','in-message onboarding reopen control is missing');
requireText(css,'.chatFont_small','chat font-size preference is missing');
requireText(css,'.fontSizeChoices','chat font-size choices are missing');
requireText(css,'.brandWatermarkSecondary','approved secondary Namaa watermark is missing');
requireText(css,'.brandWatermarkTertiary','approved tertiary Namaa watermark is missing');

requireText(workspace,'messagesScrollRef','message-scroll ownership is missing');
requireText(workspace,'container.scrollTop=container.scrollHeight','automatic scroll-to-latest behavior is missing');
requireText(workspace,"e.currentTarget.style.height='auto'",'composer auto-grow reset is missing');
requireText(workspace,"onBlur={e=>{if(!draft.trim())e.currentTarget.style.height='40px'}}",'empty composer collapse behavior is missing');

const sendIndex=workspace.indexOf('className={styles.sendButton}');
const textareaIndex=workspace.indexOf('<textarea ref={composerTextareaRef}');
const attachIndex=workspace.indexOf('className={styles.attachButton}');
if(!(sendIndex>=0&&textareaIndex>sendIndex&&attachIndex>textareaIndex)){
  failures.push('RTL composer DOM order must remain send, textarea, attachment');
}

requireText(css,'.agentMessage{\n  align-self:flex-end','governor messages must remain on the right');
requireText(css,'.userMessage{\n  align-self:flex-start','user messages must remain on the left');
forbid(workspace,/resumeIntakeButton/,'structured intake reopen must remain inside the active message');
for(const required of ['showStructuredAction','onOpenStructuredIntake','inlineIntakeButton']){
  requireText(workspace,required,'structured intake in-message action missing: '+required);
}

for(const required of [
  "setDetailTab('role')","setDetailTab('team')","setDetailTab('files')",
  "setDetailTab('policies')","setDetailTab('authority')","setDetailTab('procedures')","setDetailTab('records')",
  'السياسات واللوائح','مصفوفة الصلاحيات','الإجراءات والآليات',
  'EntityReferenceList','setActiveGovernedDocument(value)','classifyGovernedReference',
  "setGovernanceMode('governance')",'rolePortraitByKey','userMessageIdentity',
  'EntityDashboardMobilePage','styles.accountSurfaceSheet'
]){
  requireText(workspace,required,'governed conversation/entity capability missing: '+required);
}

for(const persona of [
  '/brand/personas/central-governor.webp',
  '/brand/personas/central-bank-manager.webp',
  '/brand/personas/hilal-manager.webp',
  '/brand/personas/solvency-manager.webp',
  '/brand/personas/assets-manager.webp',
  '/brand/personas/budget-spending-owner.webp',
  '/brand/personas/obligations-owner.webp',
  '/brand/personas/goals-owner.webp',
  '/brand/personas/investment-owner.webp',
  '/brand/personas/liquidity-protection-owner.webp',
  '/brand/personas/economic-advisor.webp',
  '/brand/personas/central-secretary.webp',
]){
  requireText(personaAssets,persona,'approved persona mapping missing: '+persona);
}

requireText(workspace,"new Set(['dependents','accounts','obligations','goals'])",'simple onboarding questions must remain directly answerable in chat');
requireText(css,'.entityDetailTabs','entity detail tabs are missing');
requireText(css,'overflow-x:hidden','chat/entity surfaces must contain horizontal overflow');
requireText(css,'.mobileOverlay{\n  position:fixed!important;','mobile/tablet overlay authority is missing');
requireText(css,'.mobileSideSheet','governed side sheet is missing');

if(failures.length){
  console.error('CHAT-UI-INTEGRITY-FAIL '+failures.length+' issue(s)');
  for(const failure of failures) console.error('- '+failure);
  process.exit(1);
}
console.log('CHAT-UI-INTEGRITY-PASS mobile/tablet chat-first authority and governed capabilities are intact');
