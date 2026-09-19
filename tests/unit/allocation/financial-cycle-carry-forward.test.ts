import { describe, expect, it } from 'vitest';
import { buildCarryForwardGuidance, carryForwardNoteForOwner, type NextCycleCarryForward } from '@/lib/allocation/financial-cycle-carry-forward';

describe('financial cycle carry-forward',()=>{
  it('turns previous overrun into review guidance without automatic amount adjustment',()=>{
    const results=[{
      ownerKey:'budget-spending-owner',ownerName:'مسؤول الميزانية والإنفاق',status:'EXCEEDED_APPROVED' as const,
      requestedAmount:4500,approvedAmount:4000,realizedAmount:4300,varianceAmount:300,evidenceCount:7,accountabilityNote:''
    }];
    const guidance=buildCarryForwardGuidance(results);
    expect(guidance['budget-spending-owner']?.join(' ')).toContain('سبب التجاوز');
    expect(guidance['budget-spending-owner']?.join(' ')).toContain('لا تكرر المبلغ السابق تلقائيًا');
  });

  it('does not auto-cut unused allocations',()=>{
    const carry:NextCycleCarryForward={
      sourceCycleId:'c1',sourcePlanId:'p1',sourcePlanVersionId:'v1',sourcePlanVersionNumber:1,planRevisionCount:1,
      responsibilities:[{
        ownerKey:'investment-owner',ownerName:'مسؤول الاستثمار',status:'UNUSED_ALLOCATION',
        requestedAmount:1500,approvedAmount:1000,realizedAmount:0,varianceAmount:-1000,evidenceCount:0,accountabilityNote:''
      }],
      guidanceByOwner:{'investment-owner':['لا تُخفّض طلب الدورة الجديدة آليًا لمجرد عدم الاستخدام السابق.']},
      noAutomaticScore:true,noAutomaticAmountAdjustment:true,
    };
    const note=carryForwardNoteForOwner(carry,'investment-owner');
    expect(note?.amountPolicy).toContain('لا يتم نسخ أو رفع أو خفض');
  });
});
