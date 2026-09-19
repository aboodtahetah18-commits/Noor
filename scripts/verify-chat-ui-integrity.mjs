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
if(!css.includes('.mobileBrandLockup') || !css.includes('color:var(--ux-text-inverse)')) fail('approved white Namaa word lockup missing');
if(!css.includes('.mobileBrandLockup img') || !css.includes('filter:none')) fail('colored brand leaf treatment missing');
if(!css.includes('.onboardingIntake') || !css.includes('position:fixed')) fail('onboarding must remain a popup layer');
if(!css.includes('.onboardingCloseButton') || !css.includes('.resumeIntakeButton')) fail('onboarding close/reopen controls missing');
if(!css.includes('.chatFont_small') || !css.includes('.fontSizeChoices')) fail('user chat font control missing');
if(!css.includes('.brandWatermarkSecondary') || !css.includes('.brandWatermarkTertiary')) fail('approved Namaa watermark pattern missing');
if(/\.agentMessage\{[^}]*!important|\.userMessage\{[^}]*!important/s.test(css)) fail('message alignment must not depend on !important');

console.log('CHAT-UI-INTEGRITY-PASS');
