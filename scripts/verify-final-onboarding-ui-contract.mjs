import fs from 'node:fs';

const intake=fs.readFileSync('src/components/conversations/governor-onboarding-intake.tsx','utf8');
const workspace=fs.readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=fs.readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

const failures=[];
const requiredIntake=[
  'onReviewPreviousData',
  'تعديل بيانات سابقة',
  'متابعة بالدردشة',
  'تأكيد ومتابعة',
  'حفظ ومتابعة',
];
for(const token of requiredIntake) if(!intake.includes(token)) failures.push('missing onboarding token: '+token);
if(!workspace.includes('onReviewPreviousData={()=>void openOnboardingReview()}')) failures.push('onboarding intake is not wired to the review/edit surface');
if(!css.includes('/* Block 4 — compact onboarding and final UI */')) failures.push('compact onboarding visual contract missing');
if(!css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')) failures.push('mobile compact stage grid missing');
if(!css.includes('.onboardingReviewPreviousButton')) failures.push('previous-data edit action styling missing');

const roleSheet=fs.readFileSync('src/components/conversations/algorithm-role-mobile-sheet.tsx','utf8');
const governedSheet=fs.readFileSync('src/components/conversations/governed-document-mobile-sheet.tsx','utf8');

if(!css.includes('/* Final release — dark drawer identity visibility */')) failures.push('final dark drawer identity lock missing');
if(!css.includes('.mobileSideSheet .roomItemShell .roomCopy strong')) failures.push('dark drawer person name visibility rule missing');
if(!css.includes('.mobileSideSheet .roomItemShell .roomCopy small')) failures.push('dark drawer role/subtitle visibility rule missing');
for(const token of ['تعديل إصلاحي / إملائي','طلب تعديل حوكمي']){
  if(!roleSheet.includes(token)) failures.push('job description edit action missing: '+token);
  if(!governedSheet.includes(token)) failures.push('governed document edit action missing: '+token);
}
if(!roleSheet.includes("operation:'TYPO_CORRECTION'")||!roleSheet.includes("operation:'CREATE'")) failures.push('job description must use governed correction and amendment operations');


if(failures.length){
  console.error('FINAL-ONBOARDING-UI-CONTRACT-FAIL');
  for(const failure of failures) console.error('- '+failure);
  process.exit(1);
}
console.log('FINAL-ONBOARDING-UI-CONTRACT-PASS');
