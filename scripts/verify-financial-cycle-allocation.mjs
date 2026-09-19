import { readFileSync } from 'node:fs';
const engine=readFileSync('src/lib/allocation/financial-cycle-allocation-engine.ts','utf8');
const council=readFileSync('src/lib/conversations/council-deliberation-engine.ts','utf8');
for(const key of ['budget-spending-owner','obligations-owner','goals-owner','investment-owner','liquidity-protection-owner']){
  if(!engine.includes(key)) throw new Error('ALLOCATION-OWNER-MISSING '+key);
}
if(!engine.includes("liquidityTarget:null")||!engine.includes("investableOpportunityAmount:null")){
  throw new Error('ALLOCATION-NO-INVENTED-PERCENTAGES-CONTRACT-MISSING');
}
if(!council.includes('allocation_claim')||!council.includes('allocation_summary')){
  throw new Error('COUNCIL-LIVE-ALLOCATION-NOT-WIRED');
}
console.log('FINANCIAL-CYCLE-ALLOCATION-PASS');
