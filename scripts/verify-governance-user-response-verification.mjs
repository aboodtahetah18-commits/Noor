import { readFileSync } from 'node:fs';
const response=readFileSync('src/lib/governance/governance-followup-user-response.ts','utf8');
const api=readFileSync('src/app/api/conversations/followups/respond/route.ts','utf8');
const lifecycle=readFileSync('src/lib/governance/institutional-decision-followups.ts','utf8');
const history=readFileSync('src/lib/governance/governance-followup-history.ts','utf8');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const migration=readFileSync('database/migrations/20260920_077_conversation_followup_evidence_blobs.sql','utf8');

for(const token of ['FOLLOWUP_NOT_WAITING_USER','VERIFICATION_PENDING','institutional_decision_followup_user_response','PENDING_REVIEW','conversation_attachment_blobs']){
  if(!response.includes(token)&&!migration.includes(token)) throw new Error('USER-RESPONSE-VERIFICATION-CONTRACT-MISSING '+token);
}
if(!lifecycle.includes("'VERIFICATION_PENDING'")) throw new Error('FOLLOWUP-LIFECYCLE-VERIFICATION-STATE-MISSING');
if(!history.includes("'USER_RESPONDED'")||!history.includes('institutional_decision_followup_user_response')) throw new Error('FOLLOWUP-HISTORY-USER-RESPONSE-MISSING');
for(const token of ['submitOversightUserResponse','إرفاق إثبات','إرسال للتحقق','FormData','/api/conversations/followups/respond']){
  if(!workspace.includes(token)) throw new Error('USER-RESPONSE-UI-MISSING '+token);
}
if(/COMPLETED/.test(response.split('recordFollowupUserResponse')[1]??'')) throw new Error('USER-RESPONSE-MUST-NOT-AUTO-COMPLETE');
if(!api.includes('oversight_dashboard:await getGovernanceOversightDashboard(user.id)')) throw new Error('USER-RESPONSE-MUST-REFRESH-OVERSIGHT');
console.log('GOVERNANCE-USER-RESPONSE-VERIFICATION-PASS');
