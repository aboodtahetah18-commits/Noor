import { beforeEach,describe,expect,it,vi } from 'vitest';

const {sqlMock,runPipeline}=vi.hoisted(()=>({sqlMock:vi.fn(),runPipeline:vi.fn()}));
vi.mock('@/infrastructure/db/client',()=>({rawSql:sqlMock}));
vi.mock('@/features/financial-engine/services/run-full-cycle-pipeline',()=>({runFullCyclePipelineForUser:runPipeline}));

import { runFinancialEngineRecalcJob } from '@/features/financial-engine/jobs/run-financial-engine-recalc';

const u1='11111111-1111-4111-8111-111111111111';
const c1='22222222-2222-4222-8222-222222222222';
const u2='33333333-3333-4333-8333-333333333333';
const c2='44444444-4444-4444-8444-444444444444';

describe('runFinancialEngineRecalcJob',()=>{
  beforeEach(()=>{sqlMock.mockReset();runPipeline.mockReset();});

  it('processes only the queued operational cycles returned by the database',async()=>{
    sqlMock.mockResolvedValueOnce([{user_id:u1,cycle_id:c1},{user_id:u2,cycle_id:c2}]);
    runPipeline.mockResolvedValue({pipeline_status:'COMPLETED'});
    const result=await runFinancialEngineRecalcJob();
    expect(runPipeline).toHaveBeenNthCalledWith(1,u1,c1);
    expect(runPipeline).toHaveBeenNthCalledWith(2,u2,c2);
    expect(result).toEqual([
      {userId:u1,cycleId:c1,status:'SUCCESS',errorCode:null},
      {userId:u2,cycleId:c2,status:'SUCCESS',errorCode:null},
    ]);
  });

  it('isolates a failed cycle and continues processing the rest',async()=>{
    sqlMock.mockResolvedValueOnce([{user_id:u1,cycle_id:c1},{user_id:u2,cycle_id:c2}]);
    runPipeline.mockRejectedValueOnce({code:'FINANCIAL_ENGINE_RECALCULATION_REQUIRED'}).mockResolvedValueOnce({pipeline_status:'COMPLETED'});
    const result=await runFinancialEngineRecalcJob();
    expect(result[0]).toMatchObject({status:'FAILED',errorCode:'FINANCIAL_ENGINE_RECALCULATION_REQUIRED'});
    expect(result[1]).toMatchObject({status:'SUCCESS'});
    expect(runPipeline).toHaveBeenCalledTimes(2);
  });
});
