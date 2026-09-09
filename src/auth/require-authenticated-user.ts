import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserBySessionToken } from '@/lib/auth/http-auth';
import { AUTH_SESSION_COOKIE } from '@/lib/auth/session-cookie';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string | null;
  emailVerified: boolean;
  image: string | null;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const token = (await cookies()).get(AUTH_SESSION_COOKIE)?.value ?? '';
  return getUserBySessionToken(token);
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) return redirect('/login');
  return user;
}

export async function requireAuthenticatedMutationUser(scope = 'financial-write'): Promise<AuthenticatedUser> {
  await assertTrustedMutationOrigin();
  const user = await requireAuthenticatedUser();
  enforceRateLimit(`${scope}:${user.id}`);
  return user;
}
