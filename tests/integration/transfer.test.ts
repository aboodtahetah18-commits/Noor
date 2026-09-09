import { describe,it,expect } from 'vitest';
import { validateTransfer } from '@/features/transfers/schemas/transfer';

describe('Phase 15 transfer invariants',()=>{
  const base={cycleId:'11111111-1111-4111-8111-111111111111',fromAccountId:'22222222-2222-4222-8222-222222222222',toAccountId:'33333333-3333-4333-8333-333333333333',amount:'100.00',transactionDate:'2026-09-02',idempotencyKey:'transfer-1'};
  it('accepts valid different accounts',()=>expect(validateTransfer(base).success).toBe(true));
  it('rejects same account',()=>expect(validateTransfer({...base,toAccountId:base.fromAccountId}).success).toBe(false));
  it('rejects zero amount',()=>expect(validateTransfer({...base,amount:'0'}).success).toBe(false));
});
