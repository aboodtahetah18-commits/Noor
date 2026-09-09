import { expectedIncomeSchema } from '../schemas/expected-income';
import { expectedIncomeRepository } from '@/repositories/expected-income-repository';
import { financialCycleRepository } from '@/repositories/financial-cycle-repository';

export async function updateExpectedIncome(userId: string, id: string, input: unknown) {
  const parsed = expectedIncomeSchema.safeParse(input);
  if (!parsed.success) return { success:false as const, code:'VALIDATION_ERROR' as const, message:parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' };
  const existing = await expectedIncomeRepository.getById(userId,id);
  if (!existing || existing.cycleId !== parsed.data.cycleId) return { success:false as const, code:'NOT_FOUND' as const, message:'الدخل المتوقع غير موجود' };
  const cycle = await financialCycleRepository.getById(userId, parsed.data.cycleId);
  if (!cycle || cycle.status === 'CLOSING' || cycle.status === 'CLOSED') return { success:false as const, code:'CYCLE_LOCKED' as const, message:'لا يمكن تعديل الدخل المتوقع بعد بدء إغلاق الدورة' };
  try { const expectedIncome=await expectedIncomeRepository.update(userId,id,parsed.data); return expectedIncome ? {success:true as const,expectedIncome} : {success:false as const,code:'NOT_FOUND' as const,message:'الدخل المتوقع غير موجود'}; }
  catch { return {success:false as const,code:'DATABASE_ERROR' as const,message:'تعذر تحديث الدخل المتوقع'}; }
}
