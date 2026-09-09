import { obligationRepository } from '@/repositories/obligation-repository';
import { listObligationsSchema, type ListObligationsInput } from '@/features/obligations/schemas/obligation';

export async function listObligations(userId: string, input: ListObligationsInput = {}) {
  const parsed = listObligationsSchema.parse(input);
  await obligationRepository.syncStatuses(userId);
  return obligationRepository.list(userId, parsed);
}
