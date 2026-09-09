import { financialCycleRepository } from '@/repositories/financial-cycle-repository';
import { transition } from '@/state-machines';

export async function startCycleClosing(userId: string, cycleId: string) {
  const cycle = await financialCycleRepository.getById(userId, cycleId);
  if (!cycle) return { success: false as const, code: 'NOT_FOUND' as const, message: 'الدورة غير موجودة' };
  try {
    const result = transition({
      entityType: 'FINANCIAL_CYCLE',
      entityId: cycle.id,
      currentState: cycle.status,
      event: 'START_CLOSING',
      actorUserId: userId,
    });
    const ok = await financialCycleRepository.startClosing(userId, cycle.id, 'بدء إغلاق الدورة المالية');
    if (!ok) return { success: false as const, code: 'CONFLICT' as const, message: 'تعذر بدء الإغلاق بسبب تغير حالة الدورة' };
    return { success: true as const, status: result.currentState };
  } catch {
    return { success: false as const, code: 'INVALID_STATE_TRANSITION' as const, message: 'لا يمكن بدء الإغلاق من الحالة الحالية' };
  }
}
