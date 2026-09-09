import { describe, expect, it } from 'vitest';
import { validateRecordExpense } from '@/features/expenses/schemas/expense';
const base={cycleId:'11111111-1111-4111-8111-111111111111',accountId:'22222222-2222-4222-8222-222222222222',categoryId:'33333333-3333-4333-8333-333333333333',amount:'25.50',transactionDate:'2026-09-02',planningStatus:'PLANNED' as const,expenseNature:'NECESSARY' as const,idempotencyKey:'expense-1'};
describe('expense validation',()=>{
 it('accepts valid expense',()=>expect(validateRecordExpense(base).success).toBe(true));
 it('rejects zero',()=>expect(validateRecordExpense({...base,amount:'0'}).success).toBe(false));
 it('rejects >2 decimals',()=>expect(validateRecordExpense({...base,amount:'1.001'}).success).toBe(false));
});
