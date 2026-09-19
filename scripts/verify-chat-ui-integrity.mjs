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
if(!workspace.includes('mobileBrandLockup') || !workspace.includes('/brand/namaa-leaf.webp')) fail('approved Namaa white-word colored-leaf lockup missing');
if(!workspace.includes('>نماء</span>')) fail('white Namaa wordmark text missing from mobile lockup');
if(!css.includes('.mobileBrandLockup') || !css.includes('left:50%') || !css.includes('transform:translate(-50%,-50%)')) fail('mobile Namaa lockup must stay geometrically centered');
if(!css.includes('.mobileBrandLockup img') || !css.includes('filter:none')) fail('official colored leaf must not be whitened');
if(!css.includes('.onboardingIntake') || !css.includes('position:fixed')) fail('onboarding must remain a popup layer');
if(!css.includes('.onboardingCloseButton') || !css.includes('.inlineIntakeButton')) fail('onboarding close/in-message reopen controls missing');
if(!css.includes('.chatFont_small') || !css.includes('.fontSizeChoices')) fail('user chat font control missing');
if(!css.includes('.brandWatermarkSecondary') || !css.includes('.brandWatermarkTertiary')) fail('approved Namaa watermark pattern missing');
if(/\.agentMessage\{[^}]*!important|\.userMessage\{[^}]*!important/s.test(css)) fail('message alignment must not depend on !important');
if(!css.includes('.agentMessage{\n  align-self:flex-start') || !css.includes('.userMessage{\n  align-self:flex-end')) fail('approved RTL message sides changed: agent must be right, user must be left');
if(workspace.includes('resumeIntakeButton')) fail('structured intake reopen must live inside the active question message, not float over chat');
if(!workspace.includes('showStructuredAction') || !workspace.includes('متابعة استكمال البيانات')) fail('structured intake in-message action missing');

console.log('CHAT-UI-INTEGRITY-PASS');

if(!workspace.includes("setDetailTab('role')") || !workspace.includes('السجلات والسياسات')) fail('three-tab governed entity detail surface missing');
if(!workspace.includes("new Set(['dependents','accounts','obligations','goals'])")) fail('simple onboarding questions must remain directly answerable in chat');
if(!workspace.includes('userMessageIdentity')) fail('user messages must preserve visible sender identity');
