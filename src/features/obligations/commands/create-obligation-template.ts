import { obligationRepository } from '@/repositories/obligation-repository';
import { createObligationTemplateSchema, type CreateObligationTemplateInput } from '@/features/obligations/schemas/obligation';
import type { CreateObligationTemplateResult } from '@/features/obligations/types/obligation';

export type CreateObligationTemplateCommandResult =
  | { success: true; data: CreateObligationTemplateResult }
  | { success: false; message: string };

export async function createObligationTemplate(userId: string, input: CreateObligationTemplateInput): Promise<CreateObligationTemplateCommandResult> {
  const parsed = createObligationTemplateSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'بيانات الالتزام غير صالحة.' };
  try {
    return { success: true, data: await obligationRepository.createTemplate(userId, parsed.data) };
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'OBLIGATION_TEMPLATE_PRECONDITION_FAILED') return { success: false, message: 'تعذر إنشاء الالتزام. تحقق من الحساب المتوقع ثم أعد المحاولة.' };
    throw error;
  }
}
