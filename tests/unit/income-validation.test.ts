import { describe, expect, it } from 'vitest';
import { validateRecordIncome } from '@/features/income/schemas/income';

const valid={cycleId:'11111111-1111-4111-8111-111111111111',accountId:'22222222-2222-4222-8222-222222222222',amount:'10000.00',transactionDate:'2026-09-02',sourceName:'الراتب',incomeKind:'SALARY' as const,idempotencyKey:'income-1'};
describe('income validation',()=>{
 it('accepts authoritative income payload',()=>expect(validateRecordIncome(valid).success).toBe(true));
 it('rejects zero and excess precision',()=>{expect(validateRecordIncome({...valid,amount:'0'}).success).toBe(false);expect(validateRecordIncome({...valid,amount:'0.001'}).success).toBe(false)});
 it('requires idempotency key',()=>expect(validateRecordIncome({...valid,idempotencyKey:''}).success).toBe(false));
});
