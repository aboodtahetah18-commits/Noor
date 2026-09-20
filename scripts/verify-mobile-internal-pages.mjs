import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const governed=readFileSync('src/components/conversations/governed-document-mobile-sheet.tsx','utf8');
const role=readFileSync('src/components/conversations/algorithm-role-mobile-sheet.tsx','utf8');
const intake=readFileSync('src/components/conversations/governor-onboarding-intake.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');
const details=readFileSync('src/lib/conversations/governed-room-details.ts','utf8');
const embeddedDir='src/lib/governance/embedded';
const embedded=readdirSync(embeddedDir).filter(name=>name.endsWith('.ts')).map(name=>readFileSync(join(embeddedDir,name),'utf8')).join('\n');

function assert(condition,message){if(!condition)throw new Error(message);}

assert(!governed.includes('>{document.referenceCode}<'),'TECHNICAL-DOCUMENT-ID-MUST-STAY-HIDDEN');
assert(!role.includes('>{role.referenceCode}<'),'TECHNICAL-ROLE-ID-MUST-STAY-HIDDEN');
assert(!workspace.includes('<small>{role.referenceCode}</small>'),'ROLE-ID-MUST-STAY-HIDDEN-IN-ENTITY-FILE');
assert(!governed.includes('Google Drive'),'GOOGLE-DRIVE-MUST-NOT-BE-PRIMARY-UI-LABEL');
assert(governed.includes('فتح النسخة المؤرشفة'),'ARCHIVE-LINK-MUST-BE-SECONDARY-ARABIC');
assert(workspace.includes('الفريق والمسؤوليات'),'ENTITY-TEAM-TAB-MUST-BE-ARABIC-AND-CLEAR');
assert(css.includes('Mobile full-page internal surface contract'),'FULL-PAGE-MOBILE-CONTRACT-MISSING');
assert(css.includes('.mobileFieldWide'),'MOBILE-SHORT-FIELD-GRID-CONTRACT-MISSING');
assert(css.includes('.composer textarea:not(:focus)'),'MOBILE-COMPOSER-COLLAPSED-CONTRACT-MISSING');
assert(intake.includes('mobileFieldWide'),'MOBILE-INTAKE-FIELD-GROUPING-MISSING');
assert(intake.includes('إغلاق صفحة البيانات'),'MOBILE-INTAKE-FULL-PAGE-CLOSE-MISSING');

const urls=[...details.matchAll(/sourceUrl:'([^']+)'/g)].map(match=>match[1]);
for(const url of new Set(urls)){
  if(!embedded.includes(JSON.stringify(url))) throw new Error('EMBEDDED-GOVERNANCE-SOURCE-MISSING '+url);
}

console.log('MOBILE-INTERNAL-PAGES-PASS');
