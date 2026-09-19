import { describe, expect, it } from 'vitest';
import { buildGovernorPreMeetingBrief } from '@/lib/allocation/governor-pre-meeting-brief';
import type { AllocationClaim } from '@/lib/allocation/financial-cycle-allocation-engine';

const claim=(key:AllocationClaim['ownerKey'],name:string,amount:number|null,state:AllocationClaim['claimState']='READY'):AllocationClaim=>({
  ownerKey:key,ownerName:name,requestedAmount:amount,minimumAmount:amount,idealAmount:amount,claimState:state,
  rationale:[],impactIfReduced:'',evidence:[],missingEvidence:state==='NEEDS_EVIDENCE'?['بيانات ناقصة']:[],
});

describe('governor pre-meeting brief',()=>{
  it('surfaces prior overruns and current amount changes without automatic decisions',()=>{
    const carry={
      sourceCycleId:'old',sourcePlanId:'p',sourcePlanVersionId:'v',sourcePlanVersionNumber:2,planRevisionCount:2,
      responsibilities:[{
        ownerKey:'budget-spending-owner',ownerName:'مسؤول الميزانية والإنفاق',status:'EXCEEDED_APPROVED' as const,
        requestedAmount:4000,approvedAmount:4000,realizedAmount:4300,varianceAmount:300,evidenceCount:8,accountabilityNote:''
      }],
      guidanceByOwner:{},noAutomaticScore:true as const,noAutomaticAmountAdjustment:true as const,
    };
    const brief=buildGovernorPreMeetingBrief({
      carry,claims:[claim('budget-spending-owner','مسؤول الميزانية والإنفاق',4500)],currentCycleId:'new',availableIncome:10000,
    });
    expect(brief.priorExceededOwners).toContain('مسؤول الميزانية والإنفاق');
    expect(brief.items[0].requestDeltaFromPreviousApproved).toBe(500);
    expect(brief.items[0].attention.join(' ')).toContain('تبرير الزيادة');
    expect(brief.noAutomaticDecision).toBe(true);
  });

  it('marks missing evidence without inventing a requested amount',()=>{
    const brief=buildGovernorPreMeetingBrief({
      carry:null,claims:[claim('liquidity-protection-owner','مسؤول السيولة والحماية',null,'NEEDS_EVIDENCE')],
      currentCycleId:'new',availableIncome:10000,
    });
    expect(brief.currentMissingEvidenceOwners).toContain('مسؤول السيولة والحماية');
    expect(brief.items[0].currentRequestedAmount).toBeNull();
  });
});
