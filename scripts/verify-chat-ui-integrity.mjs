import { readFileSync } from 'node:fs';

const file='src/components/conversations/conversation-workspace.module.css';
const css=readFileSync(file,'utf8');

function fail(message){
  console.error('CHAT-UI-INTEGRITY-FAIL '+message);
  process.exit(1);
}
function count(pattern){
  return (css.match(pattern)||[]).length;
}

if(count(/@media\(max-width:767px\)\{/g)!==1) fail('mobile breakpoint must exist exactly once');
const critical=['chatPane','chatHeader','messages','message','agentMessage','userMessage','composer','mobileAppBar'];
for(const name of critical){
  const rx=new RegExp('(?:^|\\n)\\s*\\.'+name+'\\s*\\{','g');
  const total=count(rx);
  if(total>2) fail(name+' has conflicting duplicate structural definitions: '+total);
}
if(!css.includes('.mobileAppBar{')||!css.includes('background:var(--namaa-card)')||!css.includes(':global(html[data-theme="dark"]) .mobileAppBar{')||!css.includes('background:var(--namaa-green-900)')) fail('mobile app bar must stay light in light theme and governed dark in dark theme');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const personaAssets=readFileSync('src/components/conversations/persona-assets.ts','utf8');
if(!workspace.includes('/brand/ndos/namaa-logo-color-transparent.png')||!workspace.includes('/brand/ndos/namaa-logo-white-transparent.png')) fail('official light and dark Namaa mobile logos missing');
if(workspace.includes('mobileBrandLockup')) fail('Namaa logo must not be redrawn from text and symbol');
if(!css.includes('.mobileBrandLogo') || !css.includes('position:static') || !css.includes('transform:none') || !css.includes('.mobileAppBarPrimary{\n    direction:rtl;\n    flex-direction:row') || !css.includes('.mobileAppBarActions{\n    direction:ltr')) fail('mobile header must keep menu+logo on the right and utility actions on the far left');
if(!css.includes('filter:none')) fail('official Namaa logo must not be recolored');
if(!css.includes('.onboardingIntake') || !css.includes('position:fixed')) fail('onboarding must remain a popup layer');
if(!css.includes('.onboardingCloseButton') || !css.includes('.inlineIntakeButton')) fail('onboarding close/in-message reopen controls missing');
if(!css.includes('.chatFont_small') || !css.includes('.fontSizeChoices')) fail('user chat font control missing');
if(!css.includes('.brandWatermarkSecondary') || !css.includes('.brandWatermarkTertiary')) fail('approved Namaa watermark pattern missing');
if(/\.agentMessage\{[^}]*!important|\.userMessage\{[^}]*!important/s.test(css)) fail('message alignment must not depend on !important');
if(!css.includes('.message{\n  flex:0 0 auto;')) fail('chat messages must never shrink and clip their content');
if(!css.includes('touch-action:pan-y')) fail('mobile messages must preserve vertical touch scrolling');
if(!css.includes('box-sizing:border-box;\n    min-height:40px;\n    max-height:40dvh;\n    height:40px')) fail('empty mobile composer must stay compact at 40px and expand within a mobile viewport cap');
if(!workspace.includes("e.currentTarget.style.height='auto'")||!workspace.includes('Math.max(e.currentTarget.scrollHeight,64)')) fail('mobile composer must open to at least two lines and grow with typed content');
const sendIndex=workspace.indexOf('className={styles.sendButton}');
const textareaIndex=workspace.indexOf('<textarea ref={composerTextareaRef}');
const attachIndex=workspace.indexOf('className={styles.attachButton}');
if(!(sendIndex>=0&&textareaIndex>sendIndex&&attachIndex>textareaIndex)) fail('mobile RTL composer order must render send on the right and attachment on the left');
if(!css.includes(':global(html[data-theme="dark"]) .page{')||!css.includes('--namaa-chat-canvas:var(--ux-page-bg)')||!css.includes(':global(html[data-theme="dark"]) .agentMessage{')||!css.includes(':global(html[data-theme="dark"]) .composer textarea{')||!css.includes('background:var(--ux-section-soft-blue)')) fail('mobile dark chat surfaces and composer must use governed layered dark semantic tokens');
if(!css.includes('.specialistRoutingNote{\n    display:none')) fail('mobile specialist routing ribbon must stay visually hidden');
if(!css.includes('.mobileBrandLogoDark{display:none}')||!css.includes(':global(html[data-theme="dark"]) .mobileBrandLogoLight{display:none}')||!css.includes(':global(html[data-theme="dark"]) .mobileBrandLogoDark{display:block}')) fail('mobile logo must switch between official color and white variants by theme');
if(!workspace.includes('messagesScrollRef')||!workspace.includes('container.scrollTop=container.scrollHeight')) fail('chat must scroll its own message pane to the latest reply');
if(!workspace.includes("onBlur={e=>{if(!draft.trim())e.currentTarget.style.height='40px'}}")) fail('empty composer must collapse after focus leaves');
if(!css.includes('.agentMessage{\n  align-self:flex-end') || !css.includes('margin-left:auto;\n  margin-right:var(--ux-space-0)') || !css.includes('.userMessage{\n  align-self:flex-start') || !css.includes('margin-left:var(--ux-space-0);\n  margin-right:auto')) fail('approved message sides changed: governor must stay right and user must stay left');
if(workspace.includes('resumeIntakeButton')) fail('structured intake reopen must live inside the active question message, not float over chat');
if(!workspace.includes('showStructuredAction') || !workspace.includes('متابعة استكمال البيانات')) fail('structured intake in-message action missing');

console.log('CHAT-UI-INTEGRITY-PASS');

for(const required of ["setDetailTab('role')","setDetailTab('team')","setDetailTab('files')","setDetailTab('policies')","setDetailTab('authority')","setDetailTab('procedures')","setDetailTab('records')",'السياسات واللوائح','مصفوفة الصلاحيات','الإجراءات والآليات']){ if(!workspace.includes(required)) fail('governed entity detail section missing: '+required); }
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
  if(!personaAssets.includes(persona)) fail('approved individual persona mapping missing: '+persona);
}
if(!workspace.includes('rolePortraitByKey')) fail('approved role portrait mapping must remain visible in entity profile');
if(!workspace.includes("new Set(['dependents','accounts','obligations','goals'])")) fail('simple onboarding questions must remain directly answerable in chat');
if(!workspace.includes('userMessageIdentity')) fail('user messages must preserve visible sender identity');
if(!workspace.includes('EntityReferenceList')||!workspace.includes('setActiveGovernedDocument(value)')||!workspace.includes('classifyGovernedReference')) fail('entity source references must be categorized and actionable through the governed local document viewer');
if(!workspace.includes("setGovernanceMode('governance')")) fail('entity records and policies must open the governance center');
if(!css.includes('.detailList>span,.detailList>button{')||!css.includes('.entityReferenceContent{')) fail('actionable entity reference styles missing');
if(!css.includes('border:1px solid var(--namaa-border-strong);\n  box-shadow:var(--ux-shadow-xs);\n  overflow:hidden')) fail('message border hierarchy must remain visually strong');
if(!css.includes('border-top:1px solid var(--namaa-border-strong);\n    background:var(--namaa-card)')) fail('mobile composer top boundary must remain visible');
if(!css.includes('border:1px solid var(--namaa-border-strong);\n    border-radius:var(--ux-radius-full);\n    background:var(--namaa-card)')) fail('mobile composer input must retain its compact bordered treatment');
if(!css.includes('min-height:46px')||!css.includes('box-shadow:var(--ux-shadow-xs);\n  font:inherit;')) fail('entity detail rows must retain the approved visual hierarchy');
if(!css.includes('.entityDetailSheet{\n  width:min(calc(100% - (var(--ux-space-2) * 2)),720px);')||!css.includes('overflow-x:hidden')) fail('mobile entity detail sheet must stay inside the viewport');
if(!css.includes('.entityDetailTabs{\n  position:sticky;')||!css.includes('overflow-x:auto')||!css.includes('min-width:max-content')) fail('entity detail tabs must remain a horizontally scrollable governed mobile strip');
if(!css.includes('.entityDetailPanel>section:nth-child(3n+1)')||!css.includes('.entityDetailPanel>section:nth-child(3n+2)')) fail('entity detail section accents missing');
if(!css.includes('.roomDetailHeroIdentity')) fail('entity detail hero identity missing');
if(workspace.includes('styles.roomDetailBankMark')||workspace.includes('styles.personaBankBadge')) fail('entity detail person imagery must not include bank-logo overlays');
if(!css.includes('overflow-x:hidden')||!css.includes('.entityReferenceCopy strong')) fail('entity profile cards must contain long governed titles without horizontal overflow');
if(!workspace.includes('styles.accountSurfaceOverlay')||!workspace.includes('styles.accountSurfaceSheet')) fail('profile and settings must use focused mobile account surfaces');
if(!css.includes('.accountSurfaceScrim{\n    background:color-mix(in srgb,var(--namaa-chat-canvas) 10%,transparent)')||!css.includes('.accountSurfaceSheet{\n    top:72px;')) fail('mobile account surfaces must avoid the heavy full-screen gray veil');
if(!css.includes('background:color-mix(in srgb,var(--namaa-surface-warm) 84%,var(--namaa-card))')) fail('mobile user bubble must retain the brighter warm governed surface');
if(!css.includes(':global(html[data-theme="dark"]) .userMessage{\n    background:color-mix(in srgb,var(--ux-section-soft-teal) 72%,var(--ux-card-bg))')) fail('dark mobile user bubble must remain visibly distinct from the chat canvas');
