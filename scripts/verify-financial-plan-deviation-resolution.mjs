import { readFileSync } from 'node:fs';
const engine=readFileSync('src/lib/allocation/financial-plan-deviation-resolution.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['KEEP_PLAN','OPEN_REPLAN','SELECT_OPTION','DEVIATION_PROTECTED_DONOR_BLOCKED','ALREADY_APPLIED','external_execution:false']){
  if(!engine.includes(token)) throw new Error('DEVIATION-RESOLUTION-CONTRACT-MISSING '+token);
}
if(!engine.includes("new_plan_version_id")||!engine.includes("previous_plan_version_id")){
  throw new Error('DEVIATION-REVISION-AUDIT-LINK-MISSING');
}
if(/insert into public\.transactions|insert into public\.transfers/.test(engine)){
  throw new Error('DEVIATION-RESOLUTION-MUST-NOT-EXECUTE-MONEY');
}
if(!route.includes('NO_ACTIVE_DEVIATION_CASE')||!route.includes('parseDeviationResolutionCommand')){
  throw new Error('DEVIATION-RESOLUTION-ROUTE-NOT-WIRED');
}
console.log('FINANCIAL-PLAN-DEVIATION-RESOLUTION-PASS');
