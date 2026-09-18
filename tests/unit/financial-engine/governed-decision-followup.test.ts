import { beforeEach,describe,expect,it,vi } from 'vitest';

const sqlMock=vi.fn();
vi.mock('@/infrastructure/db/client',()=>({getRawSql:()=>sqlMock}));

import { startGovernedDecisionFollowupAfterVerifiedExecution } from '@/features/financial-engine/services/start-governed-decision-followup';

const userId='11111111-1111-4111-8111-111111111111';
const eventId='22222222-2222-4222-8222-222222222222';
const decisionId='33333333-3333-4333-8333-333333333333';

describe('startGovernedDecisionFollowupAfterVerifiedExecution',()=>{
  beforeEach(()=>sqlMock.mockReset());

  it('does not start follow-up when execution is not verified',async()=>{
    sqlMock.mockResolvedValueOnce([{
      decision_id:decisionId,
      success_criteria:{target:'ok'},
      review_date:'2026-10-01T00:00:00Z',
      latest_execution_event_status:'EVIDENCE_PENDING',
      matched_evidence_count:0,
      latest_run_id:null,
    }]);

    const result=await startGovernedDecisionFollowupAfterVerifiedExecution({userId,executionEventId:eventId});
    expect(result).toEqual({started:false,decisionId,reason:'VERIFIED_EXECUTION_REQUIRED'});
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });

  it('requires success criteria before opening follow-up',async()=>{
    sqlMock.mockResolvedValueOnce([{
      decision_id:decisionId,
      success_criteria:{},
      review_date:'2026-10-01T00:00:00Z',
      latest_execution_event_status:'VERIFIED_EXECUTION',
      matched_evidence_count:1,
      latest_run_id:null,
    }]);

    const result=await startGovernedDecisionFollowupAfterVerifiedExecution({userId,executionEventId:eventId});
    expect(result).toEqual({started:false,decisionId,reason:'SUCCESS_CRITERIA_REQUIRED'});
  });

  it('requires a measurement review date before opening follow-up',async()=>{
    sqlMock.mockResolvedValueOnce([{
      decision_id:decisionId,
      success_criteria:{target:'ok'},
      review_date:null,
      latest_execution_event_status:'VERIFIED_EXECUTION',
      matched_evidence_count:1,
      latest_run_id:null,
    }]);

    const result=await startGovernedDecisionFollowupAfterVerifiedExecution({userId,executionEventId:eventId});
    expect(result).toEqual({started:false,decisionId,reason:'REVIEW_DATE_REQUIRED'});
  });

  it('does not duplicate the initial follow-up run',async()=>{
    sqlMock.mockResolvedValueOnce([{
      decision_id:decisionId,
      success_criteria:{target:'ok'},
      review_date:'2026-10-01T00:00:00Z',
      latest_execution_event_status:'VERIFIED_EXECUTION',
      matched_evidence_count:1,
      latest_run_id:'44444444-4444-4444-8444-444444444444',
      monitoring_run_status:'COMPLETED',
    }]);

    const result=await startGovernedDecisionFollowupAfterVerifiedExecution({userId,executionEventId:eventId});
    expect(result).toEqual({started:false,decisionId,reason:'FOLLOWUP_ALREADY_ACTIVE'});
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });

  it('starts governed monitoring after verified execution with complete follow-up definition',async()=>{
    sqlMock
      .mockResolvedValueOnce([{
        decision_id:decisionId,
        success_criteria:{target:'ok'},
        review_date:'2026-10-01T00:00:00Z',
        latest_execution_event_status:'VERIFIED_EXECUTION',
        matched_evidence_count:1,
        latest_run_id:null,
      }])
      .mockResolvedValueOnce([{
        result:{
          run_id:'55555555-5555-4555-8555-555555555555',
          signals_materialized:0,
          alerts_published:0,
          escalation:'NO_TRANSITION',
        },
      }]);

    const result=await startGovernedDecisionFollowupAfterVerifiedExecution({userId,executionEventId:eventId});

    expect(result.started).toBe(true);
    if(result.started){
      expect(result.decisionId).toBe(decisionId);
      expect(result.monitoring).toMatchObject({escalation:'NO_TRANSITION'});
    }
    expect(sqlMock).toHaveBeenCalledTimes(2);
  });
});
