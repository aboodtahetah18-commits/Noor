import { readFileSync } from 'node:fs';
const ratification=readFileSync('src/lib/allocation/allocation-ratification.ts','utf8');
const council=readFileSync('src/lib/conversations/council-deliberation-engine.ts','utf8');
const route=readFileSync('src/app/api/conversations/[roomKey]/route.ts','utf8');

for(const token of ['allocation_ratified:true','external_execution:false','allocation_fingerprint']){
  if(!ratification.includes(token)) throw new Error('ALLOCATION-RATIFICATION-CONTRACT-MISSING '+token);
}
if(!ratification.includes("planning_materialization_pending:materialization.status!=='MATERIALIZED'&&materialization.status!=='ALREADY_MATERIALIZED'")){
  throw new Error('ALLOCATION-RATIFICATION-CONTRACT-MISSING dynamic planning_materialization_pending');
}
if(!ratification.includes("isExplicitAllocationRatification")||!ratification.includes("normalized")){
  throw new Error('ALLOCATION-RATIFICATION-MUST-BE-EXPLICIT');
}
if(!council.includes('allocationProposalId=randomUUID()')||!council.includes('allocation_proposal_id:allocationProposalId')){
  throw new Error('ALLOCATION-PROPOSAL-ID-MISSING');
}
if(!route.includes('NO_BALANCED_ALLOCATION_DRAFT')||!route.includes('ratifyLatestAllocationDraft')){
  throw new Error('ALLOCATION-RATIFICATION-ROUTE-NOT-WIRED');
}
console.log('ALLOCATION-RATIFICATION-PASS');
