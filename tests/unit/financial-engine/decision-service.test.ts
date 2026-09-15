import { beforeEach,describe,expect,it,vi } from 'vitest';

const sqlMock=vi.fn();
vi.mock('@/infrastructure/db/client',()=>({getRawSql:()=>sqlMock}));

import { createDecisionRequestFromRecommendation,recordUserDecision } from '@/features/financial-engine/services/decision-service';

const userId='11111111-1111-4111-8111-111111111111';
const recId='22222222-2222-4222-8222-222222222222';
const requestId='33333333-3333-4333-8333-333333333333';

describe('decision service',()=>{
  beforeEach(()=>sqlMock.mockReset());

  it('blocks a decision request when the recommendation gate is blocked',async()=>{
    sqlMock.mockResolvedValueOnce([{
      id:recId,cycle_id:'44444444-4444-4444-8444-444444444444',reason_code:'ENGINE_FREE_CASH_AVAILABLE',reason_data:{safe_allocation_ceiling:1000},
      recommendation_status:'NEW',gate_status:'BLOCKED',sensitivity:'SENSITIVE',
    }]);
    await expect(createDecisionRequestFromRecommendation({userId,recommendationId:recId})).rejects.toMatchObject({code:'RECOMMENDATION_BLOCKED',httpStatus:409});
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });

  it('routes an allowed recommendation to USER_DECISION_REQUIRED',async()=>{
    sqlMock
      .mockResolvedValueOnce([{
        id:recId,cycle_id:'44444444-4444-4444-8444-444444444444',reason_code:'ENGINE_FREE_CASH_AVAILABLE',reason_data:{safe_allocation_ceiling:1000},
        recommendation_status:'NEW',gate_status:'ALLOWED',sensitivity:'SENSITIVE',engine_version:'P2.9-v1',weights_version:'w1',thresholds_version:'t1',
        engine_snapshot_id:'55555555-5555-4555-8555-555555555555',policy_version:'p1',
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{id:requestId,status:'DRAFT',requested_amount:'500',created_at:'2026-09-15T20:00:00Z'}])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{id:requestId,status:'USER_DECISION_REQUIRED',requested_amount:'500',materiality:'HIGH',created_at:'x',updated_at:'y'}]);
    const result=await createDecisionRequestFromRecommendation({userId,recommendationId:recId,requestedAmount:'500'});
    expect(result.created).toBe(true);
    expect(result.request.status).toBe('USER_DECISION_REQUIRED');
  });

  it('rejects an amount above the recommendation ceiling before writing',async()=>{
    sqlMock.mockResolvedValueOnce([{
      id:recId,cycle_id:'44444444-4444-4444-8444-444444444444',reason_code:'ENGINE_FREE_CASH_AVAILABLE',reason_data:{safe_allocation_ceiling:1000},
      recommendation_status:'NEW',gate_status:'ALLOWED',sensitivity:'SENSITIVE',
    }]);
    await expect(createDecisionRequestFromRecommendation({userId,recommendationId:recId,requestedAmount:'1500'})).rejects.toMatchObject({code:'REQUESTED_AMOUNT_EXCEEDS_RECOMMENDATION',httpStatus:422});
  });

  it('records explicit approval and creates an execution task only after approval',async()=>{
    sqlMock
      .mockResolvedValueOnce([{id:requestId,recommendation_id:recId,decision_type:'RECOMMENDATION:TEST',requested_amount:'500',status:'USER_DECISION_REQUIRED',materiality:'HIGH'}])
      .mockResolvedValueOnce([{id:'66666666-6666-4666-8666-666666666666',action:'APPROVE',status:'RECORDED',decided_at:'x'}])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{id:'77777777-7777-4777-8777-777777777777',status:'USER_ACTION_REQUEST',action_type:'RECOMMENDATION:TEST',amount:'500',currency:'SAR',evidence_requirement:'REQUIRED',required_by:null}]);
    const result=await recordUserDecision({userId,decisionRequestId:requestId,action:'APPROVE'});
    expect(result.requestStatus).toBe('APPROVED');
    expect(result.executionTask?.status).toBe('USER_ACTION_REQUEST');
  });
});
