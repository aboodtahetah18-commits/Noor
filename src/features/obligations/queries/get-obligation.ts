import { obligationRepository } from '@/repositories/obligation-repository';
export async function getObligation(userId: string, occurrenceId: string) {
  await obligationRepository.syncStatuses(userId);
  return obligationRepository.get(userId, occurrenceId);
}
