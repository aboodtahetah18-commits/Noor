import type { ReactNode } from 'react';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { BankMessageDialog } from '@/components/bank-message-dialog';
import { FinancialFormIntelligence } from '@/components/forms/financial-form-intelligence';
import { V2AppShell } from './v2-app-shell';

export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireAuthenticatedUser();
  const profile = {
    displayName: user.name,
    email: user.email,
    timezone: 'Asia/Riyadh',
    emailVerified: user.emailVerified,
    image: user.image,
  };

  return (
    <>
      <FinancialFormIntelligence />
      <V2AppShell profile={profile}>{children}</V2AppShell>
      <BankMessageDialog />
    </>
  );
}
