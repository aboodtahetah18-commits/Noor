import { describe, expect, it } from 'vitest';
import { buildResponsibilityCycleAccountability, isCycleClosureReviewRequest, isExplicitCycleClosureApproval } from '@/lib/allocation/financial-cycle-closure';

describe('financial cycle closure accountability',()=>{
  it('compares request, approved amount and actual execution without inventing a numeric score',()=>{
    const rows=buildResponsibilityCycleAccountability({
      approved:[
        {ownerKey:'budget-spending-owner',ownerName:'مسؤول الميزانية والإنفاق',approvedAmount:4000,realizedAmount:4200,evidenceCount:8},
        {ownerKey:'investment-owner',ownerName:'مسؤول الاستثمار',approvedAmount:1000,realizedAmount:0,evidenceCount:0},
      ],
      claims:[
        {ownerKey:'budget-spending-owner',requestedAmount:4500,minimumAmount:3800,idealAmount:4800},
        {ownerKey:'investment-owner',requestedAmount:1500,minimumAmount:0,idealAmount:1500},
      ],
    });
    expect(rows[0]!).toMatchObject({requestedAmount:4500,approvedAmount:4000,realizedAmount:4200,status:'EXCEEDED_APPROVED'});
    expect(rows[1]!).toMatchObject({requestedAmount:1500,approvedAmount:1000,realizedAmount:0,status:'UNUSED_ALLOCATION'});
    expect('score' in rows[0]!).toBe(false);
  });

  it('requires explicit review and explicit closure commands',()=>{
    expect(isCycleClosureReviewRequest('مراجعة إغلاق الدورة')).toBe(true);
    expect(isExplicitCycleClosureApproval('اعتماد إغلاق الدورة')).toBe(true);
    expect(isExplicitCycleClosureApproval('تمام')).toBe(false);
    expect(isExplicitCycleClosureApproval('موافق')).toBe(false);
  });
});
