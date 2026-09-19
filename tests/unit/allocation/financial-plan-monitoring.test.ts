import { describe, expect, it } from 'vitest';
import { evaluateResponsibilityPlanMonitoring } from '@/lib/allocation/financial-plan-monitoring';

describe('financial plan monitoring',()=>{
  it('uses factual plan versus posted realization without warning thresholds',()=>{
    const result=evaluateResponsibilityPlanMonitoring(
      [{ownerKey:'budget-spending-owner',ownerName:'مسؤول الميزانية والإنفاق',plannedAmount:4000}],
      [{ownerKey:'budget-spending-owner',amount:2500,evidenceCount:5}],
    );
    expect(result[0]).toMatchObject({status:'WITHIN_PLAN',remainingAmount:1500,varianceAmount:-1500,evidenceCount:5});
  });

  it('flags only actual exceedance as exceeded',()=>{
    const result=evaluateResponsibilityPlanMonitoring(
      [{ownerKey:'obligations-owner',ownerName:'مسؤول الالتزامات',plannedAmount:3000}],
      [{ownerKey:'obligations-owner',amount:3200,evidenceCount:2}],
    );
    expect(result[0]).toMatchObject({status:'EXCEEDED',remainingAmount:0,varianceAmount:200});
  });

  it('does not infer activity when no posted evidence exists',()=>{
    const result=evaluateResponsibilityPlanMonitoring(
      [{ownerKey:'investment-owner',ownerName:'مسؤول الاستثمار',plannedAmount:1000}],[],
    );
    expect(result[0]).toMatchObject({status:'NO_ACTIVITY',realizedAmount:0,evidenceCount:0});
  });
});
