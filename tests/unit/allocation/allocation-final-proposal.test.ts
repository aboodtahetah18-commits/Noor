import { describe, expect, it } from 'vitest';
import { buildAllocationFinalProposal } from '@/lib/allocation/allocation-final-proposal';
import type { MeetingAgendaTrackingState } from '@/lib/allocation/financial-meeting-agenda-tracking';

const agenda=(blockingOpenCount:number):MeetingAgendaTrackingState=>({
  agendaMessageId:'a1',agendaCycleId:'c1',
  items:[
    {itemId:'i1',itemNumber:1,title:'دليل',priority:'BLOCKING',ownerKey:'x',ownerName:'س',status:blockingOpenCount?'NEEDS_DATA':'RESOLVED',note:null,referredTo:null,updatedAt:null},
    {itemId:'i2',itemNumber:2,title:'متابعة',priority:'NORMAL',ownerKey:null,ownerName:null,status:'OPEN',note:'لاحقًا',referredTo:null,updatedAt:null},
  ],
  blockingOpenCount,openCount:blockingOpenCount?2:1,canCloseMeeting:blockingOpenCount===0,
  noAutomaticDecision:true,noAutomaticAllocationChange:true,
});

describe('allocation final proposal',()=>{
  it('blocks ratifiable proposal while blocking agenda items remain',()=>{
    const result=buildAllocationFinalProposal({
      allocationProposalId:'p1',negotiation:{status:'BALANCED_DRAFT',unresolvedOwners:[]},
      allocationSnapshot:{cycleId:'c1'},agendaState:agenda(1),
    });
    expect(result.status).toBe('BLOCKED_BY_AGENDA');
    expect(result.ratificationReady).toBe(false);
  });

  it('carries resolved items and non-blocking followups into the ratifiable proposal',()=>{
    const result=buildAllocationFinalProposal({
      allocationProposalId:'p1',negotiation:{status:'BALANCED_DRAFT',unresolvedOwners:[]},
      allocationSnapshot:{cycleId:'c1'},agendaState:agenda(0),
    });
    expect(result.status).toBe('READY');
    expect(result.ratificationReady).toBe(true);
    expect(result.resolvedAgendaItems).toHaveLength(1);
    expect(result.nonBlockingFollowups).toHaveLength(1);
    expect(result.externalExecution).toBe(false);
  });
});
