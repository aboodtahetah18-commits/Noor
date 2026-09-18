import { beforeEach,describe,expect,it,vi } from 'vitest';

const sqlMock=vi.fn();
vi.mock('@/infrastructure/db/client',()=>({getRawSql:()=>sqlMock}));

import { enqueueCycleRecalcForMatchedTransaction } from '@/features/financial-engine/services/enqueue-matched-execution-recalc';

const userId='11111111-1111-4111-8111-111111111111';
const eventId='22222222-2222-4222-8222-222222222222';
const transactionId='33333333-3333-4333-8333-333333333333';
const cycleId='44444444-4444-4444-8444-444444444444';

describe('enqueueCycleRecalcForMatchedTransaction',()=>{
  beforeEach(()=>sqlMock.mockReset());

  it('queues recalculation only for a posted cycle-linked transaction',async()=>{
    sqlMock
      .mockResolvedValueOnce([{id:transactionId,cycle_id:cycleId,status:'POSTED'}])
      .mockResolvedValueOnce([]);
    const result=await enqueueCycleRecalcForMatchedTransaction({userId,executionEventId:eventId,transactionId});
    expect(result).toEqual({queued:true,reason:'FINAL_MATCHED_EXECUTION',cycleId});
    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('does not queue when transaction is not posted',async()=>{
    sqlMock.mockResolvedValueOnce([{id:transactionId,cycle_id:cycleId,status:'PENDING'}]);
    const result=await enqueueCycleRecalcForMatchedTransaction({userId,executionEventId:eventId,transactionId});
    expect(result).toEqual({queued:false,reason:'TRANSACTION_NOT_POSTED',cycleId});
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });

  it('does not queue when the transaction has no cycle',async()=>{
    sqlMock.mockResolvedValueOnce([{id:transactionId,cycle_id:null,status:'POSTED'}]);
    const result=await enqueueCycleRecalcForMatchedTransaction({userId,executionEventId:eventId,transactionId});
    expect(result).toEqual({queued:false,reason:'TRANSACTION_CYCLE_REQUIRED',cycleId:null});
  });
});
