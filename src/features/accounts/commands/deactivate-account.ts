import { accountRepository } from '@/repositories/account-repository';

export async function deactivateAccount(userId: string, accountId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(accountId)) {
    return { success: false as const, code: 'VALIDATION_ERROR' as const };
  }
  const changed = await accountRepository.deactivate(userId, accountId);
  return changed
    ? { success: true as const }
    : { success: false as const, code: 'NOT_FOUND' as const };
}
