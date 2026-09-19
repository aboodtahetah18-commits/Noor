import { describe, expect, it } from 'vitest';
import { buildFinancialPlanDeviationCase } from '@/lib/allocation/financial-plan-deviation-engine';
import type { FinancialPlanMonitoringSnapshot } from '@/lib/allocation/financial-plan-monitoring';

const base=(items:FinancialPlanMonitoringSnapshot['items']):FinancialPlanMonitoringSnapshot=>({
  planId:'p1',planVersionId:'v1',cycleId:'c1',versionNumber:1,monitoredAt:'2026-09-20T00:00:00Z',
  items,totalPlanned:items.reduce((s,x)=>s+x.plannedAmount,0),totalRealized:items.reduce((s,x)=>s+x.realizedAmount,0),
  totalRemaining:items.reduce((s,x)=>s+x.remainingAmount,0),exceededOwners:items.filter(x=>x.status==='EXCEEDED').map(x=>x.ownerName),
  fingerprint:'fp',externalExecution:false,
});

describe('financial plan deviation engine',()=>{
  it('builds transfer proposals only from remaining flexible allocations',()=>{
    const result=buildFinancialPlanDeviationCase(base([
      {ownerKey:'budget-spending-owner',ownerName:'مسؤول الميزانية والإنفاق',plannedAmount:4000,realizedAmount:4500,remainingAmount:0,varianceAmount:500,status:'EXCEEDED',evidenceCount:8},
      {ownerKey:'investment-owner',ownerName:'مسؤول الاستثمار',plannedAmount:1500,realizedAmount:500,remainingAmount:1000,varianceAmount:-1000,status:'WITHIN_PLAN',evidenceCount:1},
      {ownerKey:'liquidity-protection-owner',ownerName:'مسؤول السيولة والحماية',plannedAmount:2000,realizedAmount:0,remainingAmount:2000,varianceAmount:-2000,status:'NO_ACTIVITY',evidenceCount:0},
    ]));
    expect(result.status).toBe('OPTIONS_READY');
    expect(result.options.some(x=>x.kind==='TRANSFER_PROPOSAL'&&x.fromOwnerKey==='investment-owner'&&x.amount===500)).toBe(true);
    expect(result.options.some(x=>x.kind==='TRANSFER_PROPOSAL'&&'fromOwnerKey' in x&&x.fromOwnerKey==='liquidity-protection-owner')).toBe(false);
    expect(result.autoPlanChange).toBe(false);
  });

  it('does not manufacture a safe transfer when only protected buckets remain',()=>{
    const result=buildFinancialPlanDeviationCase(base([
      {ownerKey:'budget-spending-owner',ownerName:'مسؤول الميزانية والإنفاق',plannedAmount:4000,realizedAmount:4700,remainingAmount:0,varianceAmount:700,status:'EXCEEDED',evidenceCount:8},
      {ownerKey:'obligations-owner',ownerName:'مسؤول الالتزامات',plannedAmount:3000,realizedAmount:2000,remainingAmount:1000,varianceAmount:-1000,status:'WITHIN_PLAN',evidenceCount:2},
      {ownerKey:'liquidity-protection-owner',ownerName:'مسؤول السيولة والحماية',plannedAmount:2000,realizedAmount:0,remainingAmount:2000,varianceAmount:-2000,status:'NO_ACTIVITY',evidenceCount:0},
    ]));
    expect(result.status).toBe('NO_SAFE_TRANSFER');
    expect(result.unresolvedAmount).toBe(700);
  });
});
