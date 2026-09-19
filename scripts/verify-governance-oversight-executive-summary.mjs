import { readFileSync } from 'node:fs';
const view=readFileSync('src/lib/governance/governance-oversight-view.ts','utf8');
const workspace=readFileSync('src/components/conversations/persistent-conversation-workspace.tsx','utf8');
const css=readFileSync('src/components/conversations/conversation-workspace.module.css','utf8');

for(const token of ['buildOversightSummaryMetrics','المفتوحة','المتأخرة','بانتظار المستخدم','غير المسندة','المعلّقة','التصعيدات']){
  if(!view.includes(token)) throw new Error('OVERSIGHT-SUMMARY-METRIC-MISSING '+token);
}
if(!workspace.includes('summaryMetrics.map')||!workspace.includes('onClick={()=>setViewFilter(metric.filter)}')||!workspace.includes('aria-pressed={viewFilter===metric.filter}')){
  throw new Error('OVERSIGHT-SUMMARY-MUST-BE-CLICKABLE-AND-SYNC-FILTER');
}
for(const token of ['.oversightSummaryBar{','.oversightSummaryActive{']){
  if(!css.includes(token)) throw new Error('OVERSIGHT-SUMMARY-STYLE-MISSING '+token);
}
console.log('GOVERNANCE-OVERSIGHT-EXECUTIVE-SUMMARY-PASS');
