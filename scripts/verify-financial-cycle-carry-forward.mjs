import { readFileSync } from 'node:fs';
const carry=readFileSync('src/lib/allocation/financial-cycle-carry-forward.ts','utf8');
const council=readFileSync('src/lib/conversations/council-deliberation-engine.ts','utf8');

for(const token of ['EXCEEDED_APPROVED','UNUSED_ALLOCATION','noAutomaticScore:true','noAutomaticAmountAdjustment:true']){
  if(!carry.includes(token)) throw new Error('CARRY-FORWARD-CONTRACT-MISSING '+token);
}
if(!carry.includes('لا تُخفّض طلب الدورة الجديدة آليًا')||!carry.includes('لا تكرر المبلغ السابق تلقائيًا')){
  throw new Error('CARRY-FORWARD-MUST-NOT-AUTO-ADJUST');
}
if(!council.includes('prior_cycle_carry_forward')||!council.includes('getLatestClosedCycleCarryForward')){
  throw new Error('COUNCIL-CARRY-FORWARD-NOT-WIRED');
}
if(/performanceScore|score:\s*\d|automatic_amount_adjustment:true/.test(carry+council)){
  throw new Error('CARRY-FORWARD-MUST-NOT-INVENT-SCORE-OR-AUTO-AMOUNT');
}
console.log('FINANCIAL-CYCLE-CARRY-FORWARD-PASS');
