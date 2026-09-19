import { readFileSync } from 'node:fs';
const engine=readFileSync('src/lib/allocation/financial-plan-deviation-engine.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');
for(const token of ['KEEP_PLAN','OPEN_REPLAN','TRANSFER_PROPOSAL','autoPlanChange:false','externalExecution:false']){
  if(!engine.includes(token)) throw new Error('DEVIATION-CONTRACT-MISSING '+token);
}
if(engine.includes("'liquidity-protection-owner','obligations-owner'")||engine.includes("FLEXIBLE_DONOR_ORDER=['liquidity")){
  throw new Error('PROTECTED-BUCKETS-MUST-NOT-BE-AUTO-DONORS');
}
if(/update public\.budget_allocations|insert into public\.budget_allocations/.test(engine)){
  throw new Error('DEVIATION-ENGINE-MUST-NOT-CHANGE-PLAN');
}
if(!route.includes('NO_ACTIVE_PLAN_DEVIATION')||!route.includes('createFinancialPlanDeviationReplies')){
  throw new Error('DEVIATION-ROUTE-NOT-WIRED');
}
console.log('FINANCIAL-PLAN-DEVIATION-PASS');
