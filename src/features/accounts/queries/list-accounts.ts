import { accountRepository } from '@/repositories/account-repository';
export function listAccounts(userId: string, includeInactive = false) {
  return accountRepository.listByUser(userId, includeInactive);
}
