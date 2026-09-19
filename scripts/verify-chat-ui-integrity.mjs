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
if(!workspace.includes('/brand/ndos/namaa-logo-white-transparent.png')) fail('official approved dark-surface Namaa logo asset missing');
if(workspace.includes('mobileBrandLockup') || workspace.includes('>نماء</span>')) fail('hand-built or redrawn Namaa logo lockup is forbidden');
if(!css.includes('.mobileBrandLogo') || !css.includes('left:50%') || !css.includes('transform:translate(-50%,-50%)')) fail('mobile Namaa logo must stay geometrically centered');
if(!css.includes('min-width:88px')) fail('mobile full logo must respect the approved 88px minimum');
if(!css.includes('.onboardingIntake') || !css.includes('position:fixed')) fail('onboarding must remain a popup layer');
if(!css.includes('.onboardingCloseButton') || !css.includes('.inlineIntakeButton')) fail('onboarding close/in-message reopen controls missing');
if(!css.includes('.chatFont_small') || !css.includes('.fontSizeChoices')) fail('user chat font control missing');
if(!css.includes('.brandWatermarkSecondary') || !css.includes('.brandWatermarkTertiary')) fail('approved Namaa watermark pattern missing');
if(/\.agentMessage\{[^}]*!important|\.userMessage\{[^}]*!important/s.test(css)) fail('message alignment must not depend on !important');
if(!css.includes('.agentMessage{\n  align-self:flex-start') || !css.includes('.userMessage{\n  align-self:flex-end')) fail('approved RTL message sides changed: agent must be right, user must be left');
if(workspace.includes('resumeIntakeButton')) fail('structured intake reopen must live inside the active question message, not float over chat');
if(!workspace.includes('showStructuredAction') || !workspace.includes('فتح نموذج البيانات')) fail('structured intake in-message action missing');

console.log('CHAT-UI-INTEGRITY-PASS');
