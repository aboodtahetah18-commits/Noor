import { expectedIncomeSchema } from '../schemas/expected-income';
import { expectedIncomeRepository } from '@/repositories/expected-income-repository';
import { financialCycleRepository } from '@/repositories/financial-cycle-repository';

export async function createExpectedIncome(userId: string, input: unknown) {
  const parsed = expectedIncomeSchema.safeParse(input);
  if (!parsed.success) return { success:false as const, code:'VALIDATION_ERROR' as const, message: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' };
  const cycle = await financialCycleRepository.getById(userId, parsed.data.cycleId);
  if (!cycle) return { success:false as const, code:'NOT_FOUND' as const, message:'الدورة المالية غير موجودة' };
  if (cycle.status === 'CLOSING' || cycle.status === 'CLOSED') return { success:false as const, code:'CYCLE_LOCKED' as const, message:'لا يمكن تعديل الدخل المتوقع بعد بدء إغلاق الدورة' };
  try { return { success:true as const, expectedIncome: await expectedIncomeRepository.create(userId, parsed.data) }; }
  catch { return { success:false as const, code:'DATABASE_ERROR' as const, message:'تعذر إضافة الدخل المتوقع' }; }
}
