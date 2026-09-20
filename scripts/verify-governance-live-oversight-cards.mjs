import { readFileSync } from 'node:fs';
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
if(!route.includes('getGovernanceOversightDashboard'))throw new Error('LIVE-OVERSIGHT-SNAPSHOT-NOT-IMPORTED');
const snapshots=(route.match(/oversight_dashboard:await getGovernanceOversightDashboard\(user\.id\)/g)||[]).length;
if(snapshots<3)throw new Error('LIVE-OVERSIGHT-SNAPSHOT-MISSING-FROM-GOVERNANCE-ACTIONS '+snapshots);
for(const actionToken of [
  "parseOversightQuickActionCommand(text)",
  "parseFollowupDeadlineCommand(text)",
  "parseDecisionFollowupCommand(text)",
]){
  const actionStart=route.indexOf(actionToken);
  if(actionStart<0)throw new Error('LIVE-OVERSIGHT-ACTION-MISSING '+actionToken);
  const actionWindow=route.slice(actionStart,actionStart+1400);
  if(!actionWindow.includes('oversight_dashboard:await getGovernanceOversightDashboard(user.id)')){
    throw new Error('LIVE-OVERSIGHT-SNAPSHOT-MISSING-FROM-ACTION '+actionToken);
  }
}
for(const token of ['patchLiveOversightDashboard','liveOversightSummary','live_updated_at','oversight_dashboard?:Record<string,unknown>','تحديث حي']){if(!workspace.includes(token))throw new Error('LIVE-OVERSIGHT-UI-MISSING '+token)}
if(!workspace.includes('patchLiveOversightDashboard(current,data.oversight_dashboard)'))throw new Error('LIVE-OVERSIGHT-CARDS-MUST-PATCH-IN-PLACE');
console.log('GOVERNANCE-LIVE-OVERSIGHT-CARDS-PASS');
