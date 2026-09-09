import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';

export async function guardMutation(scope = 'financial-write', actorId?: string): Promise<void> {
  await assertTrustedMutationOrigin();
  enforceRateLimit(`${scope}:${actorId ?? 'anonymous'}`);
}
