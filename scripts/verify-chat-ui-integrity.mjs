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
  const rx=new RegExp('\\.'+name+'\\s*\\{','g');
  const total=count(rx);
  if(total>2) fail(name+' has conflicting duplicate definitions: '+total);
}
if(!css.includes('background:var(--namaa-green-900)')) fail('approved green mobile app bar missing');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
if(!workspace.includes('/brand/ndos/namaa-logo-white-transparent.png')) fail('official white Namaa mobile logo missing');
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
if(!css.includes('box-sizing:border-box;\n    min-height:40px;\n    max-height:112px;\n    height:40px')) fail('empty mobile composer must stay compact at 40px');
if(!workspace.includes('messagesScrollRef')||!workspace.includes('container.scrollTop=container.scrollHeight')) fail('chat must scroll its own message pane to the latest reply');
if(!workspace.includes("onBlur={e=>{if(!draft.trim())e.currentTarget.style.height='40px'}}")) fail('empty composer must collapse after focus leaves');
if(!css.includes('.agentMessage{\n  align-self:flex-end') || !css.includes('margin-left:auto;\n  margin-right:var(--ux-space-0)') || !css.includes('.userMessage{\n  align-self:flex-start') || !css.includes('margin-left:var(--ux-space-0);\n  margin-right:auto')) fail('approved message sides changed: governor must stay right and user must stay left');
if(workspace.includes('resumeIntakeButton')) fail('structured intake reopen must live inside the active question message, not float over chat');
if(!workspace.includes('showStructuredAction') || !workspace.includes('متابعة استكمال البيانات')) fail('structured intake in-message action missing');

console.log('CHAT-UI-INTEGRITY-PASS');

if(!workspace.includes("setDetailTab('role')") || !workspace.includes('السجلات والسياسات')) fail('three-tab governed entity detail surface missing');
if(!workspace.includes("new Set(['dependents','accounts','obligations','goals'])")) fail('simple onboarding questions must remain directly answerable in chat');
if(!workspace.includes('userMessageIdentity')) fail('user messages must preserve visible sender identity');
