import { describe, expect, it } from 'vitest';
import { negotiateAllocationClaims } from '@/lib/allocation/financial-cycle-negotiation-engine';
import type { AllocationClaim, FinancialCycleAllocationSnapshot } from '@/lib/allocation/financial-cycle-allocation-engine';

const snapshot=(income:number|null):FinancialCycleAllocationSnapshot=>({
  availableIncome:income,budgetPlannedAmount:null,knownHouseholdEssentials:0,monthlyObligations:0,
  monthlyGoalNeed:null,liquidBalance:null,liquidityTarget:null,investableOpportunityAmount:null,cycleId:'c1',evidence:[],
});
const claim=(ownerKey:AllocationClaim['ownerKey'],ownerName:string,requested:number|null,minimum:number|null):AllocationClaim=>({
  ownerKey,ownerName,requestedAmount:requested,minimumAmount:minimum,idealAmount:requested,claimState:requested===null?'NEEDS_EVIDENCE':'READY',
  rationale:[],impactIfReduced:'',evidence:[],missingEvidence:requested===null?['دليل ناقص']:[],
});

describe('financial cycle negotiation engine',()=>{
  it('reduces only inside a declared flexible margin',()=>{
    const claims=[
      claim('budget-spending-owner','الميزانية',5000,5000),
      claim('obligations-owner','الالتزامات',3000,3000),
      claim('investment-owner','الاستثمار',2000,0),
    ];
    const result=negotiateAllocationClaims(snapshot(9000),claims);
    expect(result.status).toBe('BALANCED_DRAFT');
    expect(result.draftAllocations.find(x=>x.ownerKey==='investment-owner')?.amount).toBe(1000);
    expect(result.draftAllocations.find(x=>x.ownerKey==='obligations-owner')?.amount).toBe(3000);
    expect(result.requiresUserRatification).toBe(true);
    expect(result.autoExecution).toBe(false);
  });

  it('does not cut protected minimums to manufacture balance',()=>{
    const claims=[
      claim('budget-spending-owner','الميزانية',5000,5000),
      claim('obligations-owner','الالتزامات',4000,4000),
    ];
    const result=negotiateAllocationClaims(snapshot(7000),claims);
    expect(result.status).toBe('UNRESOLVED_CONFLICT');
    expect(result.remainingGap).toBe(2000);
    expect(result.turns.every(turn=>turn.action!=='YIELD')).toBe(true);
  });

  it('stops ratification when evidence is missing',()=>{
    const claims=[
      claim('budget-spending-owner','الميزانية',4000,4000),
      claim('liquidity-protection-owner','السيولة',null,null),
    ];
    const result=negotiateAllocationClaims(snapshot(8000),claims);
    expect(result.status).toBe('NEEDS_EVIDENCE');
    expect(result.unresolvedOwners).toContain('السيولة');
  });
});
