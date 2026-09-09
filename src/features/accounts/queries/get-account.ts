import { accountRepository } from '@/repositories/account-repository';
export function getAccount(userId: string, accountId: string) {
  return accountRepository.getById(userId, accountId);
}
