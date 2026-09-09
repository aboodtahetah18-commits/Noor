import { obligationRepository } from '@/repositories/obligation-repository';
export function syncObligationStatuses(userId?: string) {
  return obligationRepository.syncStatuses(userId);
}
