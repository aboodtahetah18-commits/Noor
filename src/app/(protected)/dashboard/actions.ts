'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revokeSession } from '@/lib/auth/http-auth';
import { AUTH_SESSION_COOKIE, authCookieOptions } from '@/lib/auth/session-cookie';
import { assertTrustedMutationOrigin } from '@/security/request-origin';

export async function logout() {
  await assertTrustedMutationOrigin();
  const store = await cookies();
  const token = store.get(AUTH_SESSION_COOKIE)?.value ?? '';
  await revokeSession(token);
  store.set(AUTH_SESSION_COOKIE, '', { ...authCookieOptions(new Date(0)), maxAge: 0 });
  redirect('/login');
}
