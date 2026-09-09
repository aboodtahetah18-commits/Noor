import { describe,expect,it } from 'vitest';
import { expectedIncomeSchema } from '@/features/expected-income/schemas/expected-income';
describe('ExpectedIncome validation',()=>{
 it('accepts valid expected salary',()=>expect(expectedIncomeSchema.safeParse({cycleId:'11111111-1111-4111-8111-111111111111',sourceName:'الراتب',expectedAmount:'10000.00',expectedDate:'2026-09-27',incomeKind:'SALARY',isPrimary:true}).success).toBe(true));
 it('rejects zero amount',()=>expect(expectedIncomeSchema.safeParse({cycleId:'11111111-1111-4111-8111-111111111111',sourceName:'الراتب',expectedAmount:'0',expectedDate:'2026-09-27',incomeKind:'SALARY',isPrimary:true}).success).toBe(false));
});
