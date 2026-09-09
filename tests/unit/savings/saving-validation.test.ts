import { describe, expect, it } from 'vitest';
import { validateSavingTransfer } from '@/features/savings/schemas/saving';
const base={savingAllocationId:'11111111-1111-1111-1111-111111111111',fromAccountId:'22222222-2222-2222-2222-222222222222',toAccountId:'33333333-3333-3333-3333-333333333333',amount:'500.00',transactionDate:'2026-09-02',idempotencyKey:'save-1'};
describe('saving transfer validation',()=>{
  it('accepts a valid transfer',()=>expect(validateSavingTransfer(base).success).toBe(true));
  it('rejects same source and destination',()=>expect(validateSavingTransfer({...base,toAccountId:base.fromAccountId}).success).toBe(false));
  it('rejects non-positive amounts',()=>expect(validateSavingTransfer({...base,amount:'0'}).success).toBe(false));
});
