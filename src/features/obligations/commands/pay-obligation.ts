import { obligationRepository } from '@/repositories/obligation-repository';
import { payObligationSchema, type PayObligationInput } from '@/features/obligations/schemas/obligation';
import type { PayObligationResult } from '@/features/obligations/types/obligation';

export type PayObligationCommandResult =
  | { success: true; data: PayObligationResult }
  | { success: false; message: string };

export async function payObligation(userId: string, input: PayObligationInput): Promise<PayObligationCommandResult> {
  const parsed = payObligationSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'بيانات السداد غير صالحة.' };
  try {
    return { success: true, data: await obligationRepository.pay(userId, parsed.data) };
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'OBLIGATION_NOT_FOUND') return { success: false, message: 'الاستحقاق غير موجود.' };
    if (code === 'INVALID_STATE_TRANSITION') return { success: false, message: 'لا يمكن سداد هذا الاستحقاق في حالته الحالية.' };
    if (code === 'OBLIGATION_PAYMENT_AMOUNT_MISMATCH') return { success: false, message: 'مبلغ السداد يجب أن يطابق مبلغ الاستحقاق. السداد الجزئي غير معتمد في V1.' };
    if (code === 'IDEMPOTENCY_KEY_REUSED') return { success: false, message: 'تم استخدام مفتاح العملية لطلب مختلف.' };
    if (code === 'OBLIGATION_PAYMENT_PRECONDITION_FAILED') return { success: false, message: 'تعذر تسجيل السداد. تحقق من الدورة والحساب وحالة الالتزام.' };
    throw error;
  }
}
