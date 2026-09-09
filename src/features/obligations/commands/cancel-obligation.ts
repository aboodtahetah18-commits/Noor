import { obligationRepository } from '@/repositories/obligation-repository';
import { cancelObligationSchema, type CancelObligationInput } from '@/features/obligations/schemas/obligation';
import type { ObligationListItem } from '@/features/obligations/types/obligation';

export type CancelObligationResult =
  | { success: true; data: ObligationListItem }
  | { success: false; message: string };

export async function cancelObligation(userId: string, input: CancelObligationInput): Promise<CancelObligationResult> {
  const parsed = cancelObligationSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'بيانات الإلغاء غير صالحة.' };
  try {
    return { success: true, data: await obligationRepository.cancel(userId, parsed.data.obligationOccurrenceId, parsed.data.reason) };
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'OBLIGATION_NOT_FOUND') return { success: false, message: 'الاستحقاق غير موجود.' };
    if (code === 'INVALID_STATE_TRANSITION') return { success: false, message: 'الإلغاء متاح فقط للاستحقاق القادم UPCOMING.' };
    throw error;
  }
}
