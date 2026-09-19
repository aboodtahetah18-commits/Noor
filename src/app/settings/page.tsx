import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { SettingsClient } from './settings-client';

export const dynamic='force-dynamic';

export default async function SettingsPage(){
  await requireAuthenticatedUser();
  return <SettingsClient/>;
}
