import { readFileSync } from 'node:fs';
const engine=readFileSync('src/lib/allocation/financial-cycle-negotiation-engine.ts','utf8');
const council=readFileSync('src/lib/conversations/council-deliberation-engine.ts','utf8');
for(const required of ['BALANCED_DRAFT','UNRESOLVED_CONFLICT','NEEDS_EVIDENCE','requiresUserRatification:true','autoExecution:false']){
  if(!engine.includes(required)) throw new Error('NEGOTIATION-CONTRACT-MISSING '+required);
}
if(!engine.includes("const FLEX_ORDER")||!engine.includes("'investment-owner'")){
  throw new Error('NEGOTIATION-FLEX-ORDER-MISSING');
}
if(/Math\.max\(0,income\s*\*/.test(engine)||/0\.\d+\s*\*\s*income/.test(engine)){
  throw new Error('NEGOTIATION-MUST-NOT-INVENT-PERCENTAGES');
}
if(!council.includes('negotiationViews')||!council.includes('ratification_required:true')||!council.includes('auto_execution:false')){
  throw new Error('COUNCIL-NEGOTIATION-NOT-WIRED');
}
console.log('FINANCIAL-CYCLE-NEGOTIATION-PASS');
