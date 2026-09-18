import { beforeEach,describe,expect,it,vi } from 'vitest';

const sqlMock=vi.fn();
vi.mock('@/infrastructure/db/client',()=>({getRawSql:()=>sqlMock}));

import { startGovernedDecisionFollowupAfterVerifiedExecution } from '@/features/financial-engine/services/start-governed-decision-followup';

describe('UAT RESULT 75',()=>{
  beforeEach(()=>sqlMock.mockReset());

  it('does not learn from a decision that was approved but not verified as executed',async()=>{
    const userId='11111111-1111-4111-8111-111111111111';
    const executionEventId='22222222-2222-4222-8222-222222222222';
    const decisionId='33333333-3333-4333-8333-333333333333';

    sqlMock.mockResolvedValueOnce([{
      decision_id:decisionId,
      success_criteria:{expected_saving:600},
      review_date:'2026-10-31T00:00:00Z',
      latest_execution_event_status:null,
      matched_evidence_count:0,
      latest_run_id:null,
    }]);

    const result=await startGovernedDecisionFollowupAfterVerifiedExecution({userId,executionEventId});
    expect(result).toEqual({
      started:false,
      decisionId,
      reason:'VERIFIED_EXECUTION_REQUIRED',
    });
  });
});
