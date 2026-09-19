import { describe, expect, it } from 'vitest';
import { buildFinancialResponsibilityClaims, summarizeAllocationConflict } from '@/lib/allocation/financial-cycle-allocation-engine';

describe('financial cycle allocation engine',()=>{
  it('does not invent liquidity or investment percentages when evidence is missing',()=>{
    const snapshot={
      availableIncome:10000,budgetPlannedAmount:4000,knownHouseholdEssentials:0,
      monthlyObligations:2000,monthlyGoalNeed:1000,liquidBalance:5000,
      liquidityTarget:null,investableOpportunityAmount:null,cycleId:'cycle-1',evidence:[],
    };
    const claims=buildFinancialResponsibilityClaims(snapshot);
    expect(claims.find(c=>c.ownerKey==='liquidity-protection-owner')).toMatchObject({requestedAmount:null,claimState:'NEEDS_EVIDENCE'});
    expect(claims.find(c=>c.ownerKey==='investment-owner')).toMatchObject({requestedAmount:null,claimState:'NEEDS_EVIDENCE'});
  });

  it('detects a conflict when known claims exceed available income',()=>{
    const snapshot={
      availableIncome:8000,budgetPlannedAmount:5000,knownHouseholdEssentials:0,
      monthlyObligations:2500,monthlyGoalNeed:1200,liquidBalance:1000,
      liquidityTarget:2000,investableOpportunityAmount:5000,cycleId:'cycle-1',evidence:[],
    };
    const claims=buildFinancialResponsibilityClaims(snapshot);
    const summary=summarizeAllocationConflict(snapshot,claims);
    expect(summary.conflict).toBe(true);
    expect(summary.known_requested_total).toBeGreaterThan(8000);
  });

  it('caps investment demand at protected residual and opportunity size',()=>{
    const snapshot={
      availableIncome:12000,budgetPlannedAmount:4000,knownHouseholdEssentials:0,
      monthlyObligations:2000,monthlyGoalNeed:1000,liquidBalance:2500,
      liquidityTarget:3000,investableOpportunityAmount:6000,cycleId:'cycle-1',evidence:[],
    };
    const claims=buildFinancialResponsibilityClaims(snapshot);
    expect(claims.find(c=>c.ownerKey==='investment-owner')?.requestedAmount).toBe(4500);
  });
});
