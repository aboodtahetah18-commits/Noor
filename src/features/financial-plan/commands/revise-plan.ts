import { reviseFinancialPlanSchema } from '../schemas/financial-plan';
import { financialPlanRepository } from '@/repositories/financial-plan-repository';
import { transition } from '@/state-machines';

export async function revisePlan(userId: string, input: unknown) {
  const parsed = reviseFinancialPlanSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, code: 'VALIDATION_ERROR' as const, message: parsed.error.issues[0]?.message ?? 'بيانات التعديل غير صالحة' };
  const plan = await financialPlanRepository.getById(userId, parsed.data.planId);
  if (!plan) return { success: false as const, code: 'NOT_FOUND' as const, message: 'الخطة غير موجودة' };
  try {
    transition({ entityType: 'FINANCIAL_PLAN', entityId: plan.id, currentState: plan.status, event: 'REVISE_PLAN', actorUserId: userId, reason: parsed.data.revisionReason });
  } catch {
    return { success: false as const, code: 'INVALID_STATE_TRANSITION' as const, message: 'لا يمكن تعديل الخطة في حالتها الحالية' };
  }
  try {
    return { success: true as const, versionId: await financialPlanRepository.createRevision(userId, parsed.data) };
  } catch {
    return { success: false as const, code: 'DATABASE_ERROR' as const, message: 'تعذر إنشاء نسخة التعديل' };
  }
}
