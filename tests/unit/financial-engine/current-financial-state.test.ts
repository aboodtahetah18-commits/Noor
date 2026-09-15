import { beforeEach,describe,expect,it,vi } from 'vitest';

const sqlMock=vi.fn();
vi.mock('@/infrastructure/db/client',()=>({getRawSql:()=>sqlMock}));

import { getCurrentFinancialState } from '@/features/financial-engine/queries/get-current-financial-state';

const userId='11111111-1111-4111-8111-111111111111';
const cycleId='22222222-2222-4222-8222-222222222222';

describe('getCurrentFinancialState',()=>{
  beforeEach(()=>sqlMock.mockReset());

  it('returns only the current valid engine snapshot and score',async()=>{
    sqlMock.mockResolvedValueOnce([{id:cycleId}]).mockResolvedValueOnce([{
      cycle_id:cycleId,snapshot_id:'33333333-3333-4333-8333-333333333333',score_assessment_id:'44444444-4444-4444-8444-444444444444',
      as_of_at:'2026-09-15T20:00:00Z',actual_liquidity:'10000',verified_income_received:'8000',expected_income_unreceived:'2000',
      open_obligations:'4000',reserved_obligations:'4000',required_protection:'3000',free_cash_amount:'3000',protection_deficit:'0',
      projected_end_balance:'5000',projected_surplus:'5000',projected_deficit:'0',weighted_score:'81',final_state:'STABLE',confidence_score:'90',
      data_coverage_bps:9000,recommendation_readiness:'HIGH',hard_gate_code:null,
    }]);
    const result=await getCurrentFinancialState(userId,cycleId);
    expect(result.freeCashAmount).toBe('3000');
    expect(result.finalState).toBe('STABLE');
    expect(result.recommendationReadiness).toBe('HIGH');
  });

  it('rejects a cycle not owned by the authenticated user',async()=>{
    sqlMock.mockResolvedValueOnce([]);
    await expect(getCurrentFinancialState(userId,cycleId)).rejects.toMatchObject({code:'FINANCIAL_CYCLE_NOT_FOUND',httpStatus:404});
  });

  it('does not return a stale/non-current snapshot',async()=>{
    sqlMock.mockResolvedValueOnce([{id:cycleId}]).mockResolvedValueOnce([]);
    await expect(getCurrentFinancialState(userId,cycleId)).rejects.toMatchObject({code:'FINANCIAL_STATE_NOT_AVAILABLE',httpStatus:404});
  });
});
