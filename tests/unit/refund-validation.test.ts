import { describe,it,expect } from 'vitest';
import { validateRefund } from '@/features/refunds/schemas/refund';
const base={originalTransactionId:'11111111-1111-1111-1111-111111111111',accountId:'22222222-2222-2222-2222-222222222222',amount:'10.00',transactionDate:'2026-09-02',idempotencyKey:'refund-1'};
describe('refund validation',()=>{it('accepts valid refund',()=>expect(validateRefund(base).success).toBe(true));it('rejects zero',()=>expect(validateRefund({...base,amount:'0'}).success).toBe(false));});
