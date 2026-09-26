import { readFileSync } from 'node:fs';

const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const governed=readFileSync('src/components/conversations/governed-document-mobile-sheet.tsx','utf8');
const role=readFileSync('src/components/conversations/algorithm-role-mobile-sheet.tsx','utf8');
const onboarding=readFileSync('src/components/conversations/governor-onboarding-intake.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');
const localIndex=readFileSync('src/content/governance/index.ts','utf8');
const localRoute=readFileSync('src/app/api/governance/documents/[referenceCode]/route.ts','utf8');

function assert(condition,message){
  if(!condition) throw new Error(message);
}

assert(!governed.includes('<span>{document.referenceCode}</span>'),'VISIBLE-DOCUMENT-TECHNICAL-ID');
assert(!governed.includes('فتح النسخة الأصلية في Google Drive'),'VISIBLE-GOOGLE-DRIVE-LINK');
assert(!governed.includes('<strong>{item.requestId}</strong>'),'VISIBLE-AMENDMENT-REQUEST-ID');
assert(!role.includes('<span>{role.referenceCode}</span>'),'VISIBLE-ROLE-TECHNICAL-ID');
assert(!workspace.includes('<small>{role.referenceCode}</small>'),'VISIBLE-ENTITY-ROLE-ID');
assert(!workspace.includes('activeEntityReference.ref'),'VISIBLE-LEGACY-REFERENCE-ID');
assert(workspace.includes("Math.min(Math.max(e.currentTarget.scrollHeight,64),96)"),'MOBILE-COMPOSER-THREE-LINE-CAP-MISSING');
assert(css.includes('.mobileFullPageSheet')&&css.includes('height:100dvh!important'),'MOBILE-FULL-PAGE-CONTRACT-MISSING');
assert(css.includes('.mobileRecordEditorBody')&&css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'MOBILE-TWO-COLUMN-FORM-MISSING');
assert(css.includes('.mobileFieldFull')&&css.includes('grid-column:1 / -1'),'MOBILE-LONG-FIELD-FULL-WIDTH-MISSING');
assert(css.includes('.mobileRecordEditorActions')&&css.includes('grid-template-rows:auto minmax(0,1fr) auto'),'MOBILE-STICKY-ACTIONS-CONTRACT-MISSING');
assert(onboarding.includes('recurrenceLabel'),'MOBILE-ARABIC-RECURRENCE-LABEL-MISSING');
assert(onboarding.includes('اسم مختصر للحساب'),'MOBILE-ACCOUNT-ARABIC-LABEL-MISSING');
assert(localIndex.includes("COMPACT_CORE_GOVERNANCE_DOCUMENTS"),'LOCAL-GOVERNANCE-COMPACT-SOURCE-MISSING');
assert(localIndex.includes("LOCAL_GOVERNANCE_DOCUMENTS"),'LOCAL-GOVERNANCE-REGISTRY-MISSING');
assert(localIndex.includes("getLocalGovernanceDocument"),'LOCAL-GOVERNANCE-LOOKUP-EXPORT-MISSING');
assert(!localIndex.includes("batch-01")&&!localIndex.includes("central-active-policies")&&!localIndex.includes("central-active-regulations"),'LOCAL-GOVERNANCE-LEGACY-SOURCE-REINTRODUCED');
assert(localRoute.includes('getAuthenticatedUser'),'LOCAL-GOVERNANCE-AUTH-MISSING');
assert(localRoute.includes('getLocalGovernanceDocument'),'LOCAL-GOVERNANCE-LOOKUP-MISSING');
assert(governed.includes('/api/governance/documents/'),'LOCAL-GOVERNANCE-CLIENT-MISSING');

console.log('MOBILE-INTERNAL-SURFACE-CONTRACT-PASS');
