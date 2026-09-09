import { financialPlanRepository } from '@/repositories/financial-plan-repository';
import { transition } from '@/state-machines';

export async function approveRevision(userId: string, planId: string) {
  const plan = await financialPlanRepository.getById(userId, planId);
  if (!plan) return { success: false as const, code: 'NOT_FOUND' as const };
  try {
    transition({ entityType: 'FINANCIAL_PLAN', entityId: planId, currentState: plan.status, event: 'APPROVE_REVISION', actorUserId: userId });
  } catch {
    return { success: false as const, code: 'INVALID_STATE_TRANSITION' as const };
  }
  return (await financialPlanRepository.approveRevision(userId, planId))
    ? { success: true as const }
    : { success: false as const, code: 'CONFLICT' as const };
}
