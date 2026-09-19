import { describe, expect, it } from 'vitest';
import { buildFinancialMeetingOpeningAgenda } from '@/lib/allocation/financial-meeting-opening-agenda';
import type { GovernorPreMeetingBrief } from '@/lib/allocation/governor-pre-meeting-brief';

const brief:GovernorPreMeetingBrief={
  currentCycleId:'c2',availableIncome:10000,previousCycleId:'c1',previousPlanVersionNumber:2,previousPlanRevisionCount:2,
  priorExceededOwners:['مسؤول الميزانية والإنفاق'],priorUnusedOwners:['مسؤول الاستثمار'],currentMissingEvidenceOwners:['مسؤول السيولة والحماية'],
  items:[
    {ownerKey:'budget-spending-owner',ownerName:'مسؤول الميزانية والإنفاق',previousStatus:'EXCEEDED_APPROVED',previousRequestedAmount:4000,previousApprovedAmount:4000,previousRealizedAmount:4300,currentRequestedAmount:4500,requestDeltaFromPreviousApproved:500,evidenceState:'READY',attention:[]},
    {ownerKey:'investment-owner',ownerName:'مسؤول الاستثمار',previousStatus:'UNUSED_ALLOCATION',previousRequestedAmount:1500,previousApprovedAmount:1000,previousRealizedAmount:0,currentRequestedAmount:1200,requestDeltaFromPreviousApproved:200,evidenceState:'READY',attention:[]},
    {ownerKey:'liquidity-protection-owner',ownerName:'مسؤول السيولة والحماية',previousStatus:null,previousRequestedAmount:null,previousApprovedAmount:null,previousRealizedAmount:null,currentRequestedAmount:null,requestDeltaFromPreviousApproved:null,evidenceState:'NEEDS_EVIDENCE',attention:[]},
  ],
  meetingAttention:[],noAutomaticDecision:true,noAutomaticScore:true,noAutomaticAmountAdjustment:true,
};

describe('financial meeting opening agenda',()=>{
  it('orders blocking evidence and allocation conflicts into the opening agenda',()=>{
    const agenda=buildFinancialMeetingOpeningAgenda({brief,allocationConflict:true,unresolvedOwners:['مسؤول السيولة والحماية']});
    expect(agenda.blockingItemCount).toBe(2);
    expect(agenda.items.some(item=>item.source==='CURRENT_EVIDENCE'&&item.priority==='BLOCKING')).toBe(true);
    expect(agenda.items.some(item=>item.source==='ALLOCATION_CONFLICT'&&item.priority==='BLOCKING')).toBe(true);
    expect(agenda.meetingCanReachRatification).toBe(false);
  });

  it('keeps the agenda advisory and non-executing',()=>{
    const agenda=buildFinancialMeetingOpeningAgenda({brief:{...brief,currentMissingEvidenceOwners:[],items:[]},allocationConflict:false,unresolvedOwners:[]});
    expect(agenda.noAutomaticDecision).toBe(true);
    expect(agenda.noAutomaticAllocationChange).toBe(true);
    expect(agenda.externalExecution).toBe(false);
  });
});
