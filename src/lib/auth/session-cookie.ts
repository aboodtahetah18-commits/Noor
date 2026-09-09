import { AUTH_SESSION_COOKIE } from './http-auth';

export function authCookieOptions(expires?: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(expires ? { expires } : {}),
  };
}

export { AUTH_SESSION_COOKIE };
