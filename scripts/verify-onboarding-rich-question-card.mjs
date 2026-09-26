import { readFileSync } from 'node:fs';

const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of [
  'function OnboardingMessageContent',
  'next_question',
  'showStructuredAction',
  'onOpenStructuredIntake',
  'STRUCTURED_INTAKE_STEPS',
  'inlineIntakeButton',
  'onboardingPlainQuestion',
]){
  if(!workspace.includes(token)) throw new Error('ONBOARDING-QUESTION-CONTRACT-MISSING '+token);
}

if(!workspace.includes("message.structured_data?.onboarding===true")){
  throw new Error('ONBOARDING-QUESTION-MUST-BE-BOUND-TO-STRUCTURED-ONBOARDING-MESSAGES');
}
if(!workspace.includes("message.sender_type!=='user'")){
  throw new Error('ONBOARDING-STRUCTURED-ACTION-MUST-STAY-ON-AGENT-QUESTION');
}
if(!workspace.includes("String(message.structured_data?.onboarding_step??'')===String(onboardingStep??'')")){
  throw new Error('ONBOARDING-STRUCTURED-ACTION-MUST-STAY-BOUND-TO-ACTIVE-STEP');
}

for(const token of [
  '.onboardingMessageContent{',
  '.onboardingPlainQuestion{',
  '.inlineIntakeButton{',
]){
  if(!css.includes(token)) throw new Error('ONBOARDING-QUESTION-STYLE-MISSING '+token);
}
if(!css.includes('padding:var(--ux-space-2) var(--ux-space-3)')){
  throw new Error('ONBOARDING-QUESTION-MUST-USE-COMPACT-VERTICAL-SPACING');
}

console.log('ONBOARDING-RICH-QUESTION-CARD-PASS');
