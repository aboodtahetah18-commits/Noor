export const runtime='nodejs';
export const dynamic='force-dynamic';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_SESSION_COOKIE, authCookieOptions } from '@/lib/auth/session-cookie';
import { revokeSession } from '@/lib/auth/http-auth';
import { assertTrustedMutationOrigin } from '@/security/request-origin';

export async function POST(){
  await assertTrustedMutationOrigin();
  const store=await cookies();
  const token=store.get(AUTH_SESSION_COOKIE)?.value??'';
  await revokeSession(token);
  store.set(AUTH_SESSION_COOKIE,'',{...authCookieOptions(new Date(0)),maxAge:0});
  return NextResponse.json({ok:true});
}
