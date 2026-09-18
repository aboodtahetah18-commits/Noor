import { beforeEach,describe,expect,it,vi } from 'vitest';

const {sqlMock,getPolicyState,resolveRuntime,runFullPipeline}=vi.hoisted(()=>({
  sqlMock:vi.fn(),
  getPolicyState:vi.fn(),
  resolveRuntime:vi.fn(),
  runFullPipeline:vi.fn(),
}));

vi.mock('@/infrastructure/db/client',()=>({getRawSql:()=>sqlMock}));
vi.mock('@/features/financial-engine/services/central-policy-parameters',()=>({
  getCentralPolicyTextParameter:getPolicyState,
}));
vi.mock('@/features/financial-engine/services/resolve-runtime-versions',()=>({
  resolveFinancialEngineRuntimeVersions:resolveRuntime,
}));
vi.mock('@/features/financial-engine/services/run-full-cycle-pipeline',()=>({
  FINANCIAL_ENGINE_VERSIONS:{
    engine:'P2.9-v1',
    policy:'namaa-central-policy-v1',
    weights:'namaa-central-weights-v1',
    thresholds:'namaa-central-thresholds-v1',
  },
  runFullCyclePipelineForUser:runFullPipeline,
}));

import { runGovernedCycleRecalculationForUser } from '@/features/financial-engine/services/run-governed-cycle-recalculation';

const userId='11111111-1111-4111-8111-111111111111';
const cycleId='22222222-2222-4222-8222-222222222222';

describe('runGovernedCycleRecalculationForUser',()=>{
  beforeEach(()=>{
    sqlMock.mockReset();
    getPolicyState.mockReset();
    resolveRuntime.mockReset();
    runFullPipeline.mockReset();
  });

  it('recalculates facts and hard guards only while weights are non-governing',async()=>{
    getPolicyState.mockResolvedValue({
      value:'خط أساس للمحاكاة وغير حاكم',
      registry_file_id:'registry',
      registry_sheet:'إعدادات السياسات',
      synced_at:'2026-09-18T00:00:00Z',
    });
    resolveRuntime.mockResolvedValue({
      versions:{engine:'engine-v',policy:'policy-v',weights:'weights-v',thresholds:'thresholds-v'},
      sources:{engine:'BASELINE',policy:'BASELINE',weights:'BASELINE',thresholds:'BASELINE'},
      bindingIds:{},
    });
    sqlMock.mockResolvedValueOnce([{snapshot_id:'33333333-3333-4333-8333-333333333333'}]);

    const result=await runGovernedCycleRecalculationForUser(userId,cycleId);

    expect(result).toMatchObject({
      mode:'FACTS_AND_HARD_GATES_ONLY',
      cycle_id:cycleId,
      weight_governance_state:'خط أساس للمحاكاة وغير حاكم',
    });
    expect(runFullPipeline).not.toHaveBeenCalled();
  });

  it('uses the full pipeline only after the registry marks weights governing',async()=>{
    getPolicyState.mockResolvedValue({
      value:'حاكم',
      registry_file_id:'registry',
      registry_sheet:'إعدادات السياسات',
      synced_at:'2026-09-18T00:00:00Z',
    });
    runFullPipeline.mockResolvedValue({
      pipeline_status:'CURRENT',
      cycle_id:cycleId,
      engine:{},
      recommendation_generation:{},
      recommendations:[],
      runtime_binding:{
        versions:{engine:'e',policy:'p',weights:'w',thresholds:'t'},
        sources:{engine:'BASELINE',policy:'BASELINE',weights:'BASELINE',thresholds:'BASELINE'},
        bindingIds:{},
      },
    });

    const result=await runGovernedCycleRecalculationForUser(userId,cycleId);

    expect(result.mode).toBe('FULL_GOVERNING_PIPELINE');
    expect(runFullPipeline).toHaveBeenCalledWith(userId,cycleId);
    expect(resolveRuntime).not.toHaveBeenCalled();
  });
});
