import { describe, expect, it } from 'vitest';
import { buildAllocationDecisionMinutes } from '@/lib/allocation/allocation-decision-minutes';

describe('allocation decision minutes',()=>{
  it('preserves participants, resolved items, reservations and followups',()=>{
    const minutes=buildAllocationDecisionMinutes({
      proposalId:'FINAL-1',ratifiedAt:'2026-09-20T10:00:00Z',cycleId:'c1',planId:'p1',planVersionId:'v2',planVersionNumber:2,
      participants:[{key:'central-governor',name:'محافظ بنك نماء المركزي',role:'رئيس المجلس'}],
      negotiation:{status:'BALANCED_DRAFT',requestedAfter:9000,availableIncome:10000,remainingGap:0,turns:[
        {ownerKey:'budget-spending-owner',ownerName:'مسؤول الميزانية والإنفاق',action:'HOLD',reason:'أتمسك بالحد الأدنى'}
      ]},
      resolvedAgendaItems:[{itemNumber:1,title:'مراجعة التجاوز',note:'تم التفسير'}],
      nonBlockingFollowups:[{itemNumber:4,title:'متابعة هدف',status:'OPEN',note:'راجع لاحقًا',referredTo:null,ownerName:'مسؤول الأهداف'}],
    });
    expect(minutes.participants).toHaveLength(1);
    expect(minutes.reservations[0]).toMatchObject({type:'HOLD',ownerName:'مسؤول الميزانية والإنفاق'});
    expect(minutes.followups[0]).toMatchObject({assignedTo:'مسؤول الأهداف',assignmentSource:'AGENDA_OWNER'});
    expect(minutes.externalExecution).toBe(false);
  });

  it('keeps followups unassigned rather than inventing an owner',()=>{
    const minutes=buildAllocationDecisionMinutes({
      proposalId:'FINAL-2',ratifiedAt:'2026-09-20T10:00:00Z',cycleId:'c1',planId:'p1',planVersionId:'v2',planVersionNumber:2,
      participants:[],negotiation:{status:'BALANCED_DRAFT'},resolvedAgendaItems:[],
      nonBlockingFollowups:[{itemNumber:3,title:'ملاحظة عامة',status:'OPEN',note:null,referredTo:null}],
    });
    expect(minutes.followups[0]).toMatchObject({assignedTo:null,assignmentSource:'UNASSIGNED'});
  });
});
