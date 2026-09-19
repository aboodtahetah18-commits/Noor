import { readFileSync } from 'node:fs';
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of ['onboardingStepMeta','المرحلة {stepNumber} من {totalSteps}','progressPercent','onboardingQuestionCard','onboardingQuestionReason','متابعة استكمال البيانات']){
  if(!workspace.includes(token)) throw new Error('ONBOARDING-RICH-QUESTION-UI-MISSING '+token);
}
if(!workspace.includes("Math.round((stepNumber/totalSteps)*100)")){
  throw new Error('ONBOARDING-PROGRESS-MUST-BE-DERIVED-FROM-STEP');
}
for(const token of ['.onboardingQuestionCard{','.onboardingQuestionHeader{','.onboardingProgressTrack{','.onboardingQuestionReason{']){
  if(!css.includes(token)) throw new Error('ONBOARDING-RICH-QUESTION-STYLE-MISSING '+token);
}
if(!css.includes('padding:var(--ux-space-2) var(--ux-space-3)')){
  throw new Error('ONBOARDING-QUESTION-MUST-USE-COMPACT-VERTICAL-SPACING');
}
console.log('ONBOARDING-RICH-QUESTION-CARD-PASS');
