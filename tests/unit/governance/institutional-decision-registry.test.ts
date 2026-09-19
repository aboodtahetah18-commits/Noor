import { describe, expect, it } from 'vitest';
import { normalizeInstitutionalDecisionMessage } from '@/lib/governance/institutional-decision-registry';

describe('institutional decision registry',()=>{
  it('normalizes allocation decisions with pending followups',()=>{
    const item=normalizeInstitutionalDecisionMessage({
      id:'m1',createdAt:'2026-09-20T10:00:00Z',
      structuredData:{
        allocation_decision_minutes:true,allocation_decision_id:'DEC-1',allocation_decision_proposal_id:'FINAL-1',
        cycle_id:'c1',plan_id:'p1',plan_version_id:'v1',ratified_at:'2026-09-20T09:59:00Z',
        followups:[{title:'متابعة هدف',status:'OPEN',assignedTo:'مسؤول الأهداف'}],
      },
    });
    expect(item).toMatchObject({decisionType:'ALLOCATION',status:'FOLLOWUP_PENDING',cycleId:'c1',planVersionId:'v1'});
    expect(item?.followups[0]).toMatchObject({assignedTo:'مسؤول الأهداف',completed:false});
  });

  it('normalizes a versioned deviation transfer without treating it as money execution',()=>{
    const item=normalizeInstitutionalDecisionMessage({
      id:'m2',createdAt:'2026-09-20T11:00:00Z',
      structuredData:{
        deviation_resolution:true,deviation_case_id:'DEV-1',
        resolution:{kind:'TRANSFER_PROPOSAL',previous_plan_version_id:'v1',new_plan_version_id:'v2',amount:500,external_execution:false},
      },
    });
    expect(item).toMatchObject({decisionType:'PLAN_DEVIATION',status:'APPROVED',previousPlanVersionId:'v1',planVersionId:'v2',externalExecution:false});
  });

  it('normalizes cycle closure as closed',()=>{
    const item=normalizeInstitutionalDecisionMessage({
      id:'m3',createdAt:'2026-09-20T12:00:00Z',
      structuredData:{cycle_closure_approved:true,cycle_closure_fingerprint:'fp',cycle_id:'c1',plan_id:'p1',plan_version_id:'v2'},
    });
    expect(item).toMatchObject({decisionType:'CYCLE_CLOSURE',status:'CLOSED',cycleId:'c1'});
  });
});
