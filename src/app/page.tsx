import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';

export const dynamic = 'force-dynamic';

/**
 * Operational staging entrypoint.
 * Authenticated users continue to the real dashboard; unauthenticated users
 * are sent to login. The design preview remains available explicitly at
 * /preview but is no longer the application entrypoint.
 */
export default async function HomePage() {
  const user = await getAuthenticatedUser();
  redirect(user ? '/dashboard' : '/login');
}
