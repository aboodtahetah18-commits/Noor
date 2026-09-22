import fs from 'node:fs';

const login=fs.readFileSync('src/app/(public)/login/login.module.css','utf8');
const css=fs.readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');
const intake=fs.readFileSync('src/components/conversations/governor-onboarding-intake.tsx','utf8');
const role=fs.readFileSync('src/components/conversations/algorithm-role-mobile-sheet.tsx','utf8');
const governed=fs.readFileSync('src/components/conversations/governed-document-mobile-sheet.tsx','utf8');
const workspace=fs.readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');

const failures=[];

if(!login.includes('height:100dvh')||!login.includes('overflow:hidden')) failures.push('mobile login must be locked to viewport');
if(!css.includes('/* Mobile stability authority — fixed viewport, no horizontal drift */')) failures.push('mobile stability authority block missing');
if(!css.includes('overflow-x:hidden!important')) failures.push('horizontal overflow protection missing');

if(!intake.includes('const stageWindowStart=Math.floor(currentStageIndex/4)*4')) failures.push('onboarding stage window must advance in groups of four');
if(!intake.includes('const visibleStages=INTAKE_STAGES.slice(stageWindowStart,stageWindowStart+4)')) failures.push('onboarding must render four stages only');
if(!intake.includes('visibleStages.map')) failures.push('onboarding must render visible stage window');

for(const source of [role,governed]){
  if(source.includes('<small>تصحيح إملائي أو صياغي لا يغيّر الحكم أو الصلاحية.</small>')) failures.push('role edit button helper text must be removed');
  if(source.includes('<small>أي تغيير في المسؤوليات أو الصلاحيات يمر بالاعتماد.</small>')) failures.push('governance edit button helper text must be removed');
  if(source.includes('<small>تصحيح اللغة والصياغة دون تغيير الحكم.</small>')) failures.push('governed typo button helper text must be removed');
  if(source.includes('<small>تعديل يؤثر في المضمون ويمر بالاعتماد.</small>')) failures.push('governed governance button helper text must be removed');
}
if(!role.includes('name="pencil" size={24}')||!role.includes('name="landmark" size={24}')) failures.push('role edit icons must use 24px');
if(!governed.includes('name="pencil" size={24}')||!governed.includes('name="landmark" size={24}')) failures.push('governed edit icons must use 24px');

if(!role.includes('unoptimized')) failures.push('role portrait must avoid extra image recompression');
if(!workspace.includes('fill unoptimized')) failures.push('workspace persona portraits must avoid extra image recompression');

if(failures.length){
  console.error('MOBILE-STABILITY-CONTRACT-FAIL');
  for(const failure of failures) console.error('- '+failure);
  process.exit(1);
}
console.log('MOBILE-STABILITY-CONTRACT-PASS');
