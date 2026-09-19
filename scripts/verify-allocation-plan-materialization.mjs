import { readFileSync } from 'node:fs';
const materializer=readFileSync('src/lib/allocation/allocation-plan-materializer.ts','utf8');
const ratification=readFileSync('src/lib/allocation/allocation-ratification.ts','utf8');

for(const token of ['financial_plans','plan_versions','budget_allocations','RESPONSIBILITY_ALLOCATION','externalExecution:false']){
  if(!materializer.includes(token)) throw new Error('ALLOCATION-PLAN-MATERIALIZER-MISSING '+token);
}
if(!materializer.includes("revisionReason=`allocation-ratification:")||!materializer.includes('ALREADY_MATERIALIZED')){
  throw new Error('ALLOCATION-PLAN-IDEMPOTENCY-MISSING');
}
if(!materializer.includes("status:'NEEDS_CYCLE'")){
  throw new Error('ALLOCATION-PLAN-MUST-BLOCK-WITHOUT-CYCLE');
}
if(!ratification.includes('planning_materialization:materialization')||!ratification.includes('external_execution:false')){
  throw new Error('RATIFICATION-PLAN-LINK-MISSING');
}
if(/insert into public\.transactions|insert into public\.transfers/.test(materializer)){
  throw new Error('ALLOCATION-PLAN-MUST-NOT-EXECUTE-MONEY');
}
console.log('ALLOCATION-PLAN-MATERIALIZATION-PASS');
