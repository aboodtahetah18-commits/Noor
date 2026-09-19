import { readFileSync } from 'node:fs';
const closure=readFileSync('src/lib/allocation/financial-cycle-closure.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['requestedAmount','approvedAmount','realizedAmount','EXCEEDED_APPROVED','UNUSED_ALLOCATION','requiresUserClosureApproval:true','externalExecution:false']){
  if(!closure.includes(token)) throw new Error('CYCLE-CLOSURE-CONTRACT-MISSING '+token);
}
if(!closure.includes('CYCLE_CLOSURE_REVIEW_REQUIRED')||!closure.includes("status='CLOSED'")){
  throw new Error('CYCLE-CLOSURE-EXPLICIT-APPROVAL-MISSING');
}
if(/performanceScore|numericScore|score:\s*\d/.test(closure)){
  throw new Error('CYCLE-CLOSURE-MUST-NOT-INVENT-SCORES');
}
if(/insert into public\.transactions|insert into public\.transfers/.test(closure)){
  throw new Error('CYCLE-CLOSURE-MUST-NOT-EXECUTE-MONEY');
}
if(!route.includes('NO_ACTIVE_CYCLE_TO_CLOSE')||!route.includes('createFinancialCycleClosureReview')){
  throw new Error('CYCLE-CLOSURE-ROUTE-NOT-WIRED');
}
console.log('FINANCIAL-CYCLE-CLOSURE-PASS');
