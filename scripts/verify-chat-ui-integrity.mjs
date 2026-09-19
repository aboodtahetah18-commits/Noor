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
if(!css.includes('filter:brightness(0) invert(1)')) fail('approved white mobile logo treatment missing');
if(!css.includes('.onboardingIntake') || !css.includes('position:fixed')) fail('onboarding must remain a popup layer');
if(/\.agentMessage\{[^}]*!important|\.userMessage\{[^}]*!important/s.test(css)) fail('message alignment must not depend on !important');

console.log('CHAT-UI-INTEGRITY-PASS');
