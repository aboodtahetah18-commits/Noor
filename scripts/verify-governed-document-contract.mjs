import fs from 'node:fs';

const ui=fs.readFileSync('src/components/conversations/governed-document-mobile-sheet.tsx','utf8');
const role=fs.readFileSync('src/components/conversations/algorithm-role-mobile-sheet.tsx','utf8');
const css=fs.readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');
const api=fs.readFileSync('src/app/api/governance/amendments/route.ts','utf8');
const lib=fs.readFileSync('src/lib/governance/governance-amendments.ts','utf8');
const failures=[];
for(const token of ['تعديل إصلاحي / إملائي','طلب تعديل حوكمي','تحميل نسخة PDF للاطلاع','سجل التحديثات والقرارات','governedLeafPattern']) if(!ui.includes(token)) failures.push('missing governed UI token: '+token);
for(const token of ['تعديل إصلاحي / إملائي','طلب تعديل حوكمي','documentRef=role.referenceCode']) if(!role.includes(token)) failures.push('missing governed role-edit token: '+token);
if(ui.includes('name="chevronDown"')) failures.push('decorative chevrons are not allowed inside governed document content');
if(!css.includes('.governedDocumentSection>summary::-webkit-details-marker')) failures.push('native details markers are not hidden');
if(!css.includes('overflow-wrap:anywhere')) failures.push('governed document overflow protection missing');
if(!api.includes("z.literal('TYPO_CORRECTION')")) failures.push('typo correction API operation missing');
if(!lib.includes('council_required:false')) failures.push('corrective edit must remain outside council workflow');
if(!lib.includes('council_required:true')) failures.push('governance amendment must require council workflow');
if(failures.length){console.error('GOVERNED-DOCUMENT-CONTRACT-FAIL');for(const failure of failures)console.error('- '+failure);process.exit(1);}
console.log('GOVERNED-DOCUMENT-CONTRACT-PASS');
