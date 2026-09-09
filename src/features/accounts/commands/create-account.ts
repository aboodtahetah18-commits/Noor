import { createAccountSchema } from '../schemas/account';
import { accountRepository } from '@/repositories/account-repository';

export type CreateAccountResult =
  | { success: true; accountId: string }
  | { success: false; code: 'VALIDATION_ERROR' | 'CONFLICT' | 'DATABASE_ERROR'; message: string };

export async function createAccount(userId: string, input: unknown): Promise<CreateAccountResult> {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'بيانات الحساب غير صالحة' };
  }

  try {
    const accountId = await accountRepository.createWithOpeningBalance(userId, parsed.data);
    return { success: true, accountId };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('accounts_user_iban_uq')) {
      return { success: false, code: 'CONFLICT', message: 'هذا الـIBAN مسجل بالفعل في حساب نشط' };
    }
    return { success: false, code: 'DATABASE_ERROR', message: 'تعذر إنشاء الحساب' };
  }
}
