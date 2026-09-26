import type { ReactNode } from 'react';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { MobileBottomNav } from './mobile-bottom-nav';
import { DesktopTopNav } from './desktop-top-nav';
import { TabletTopNav } from './tablet-top-nav';
import { MobileTopBar } from './mobile-top-bar';
import { GlobalTopBar } from './global-top-bar';
import { BankMessageDialog } from '@/components/bank-message-dialog';
import { MobileConversationGate } from './mobile-conversation-gate';
import { FinancialFormIntelligence } from '@/components/forms/financial-form-intelligence';

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
    <div className="protected-app-shell" data-responsive-platform="full">
      <FinancialFormIntelligence />
      <a className="skip-link" href="#main-content">تجاوز إلى المحتوى الرئيسي</a>

      <DesktopTopNav />
      <GlobalTopBar profile={profile} />
      <TabletTopNav profile={profile} />
      <MobileTopBar profile={profile} />

      <main id="main-content" tabIndex={-1} className="namaa-app-main main-content-focus-target">
        <div className="namaa-page-frame">
          <MobileConversationGate>{children}</MobileConversationGate>
        </div>
      </main>

      <MobileBottomNav />
      <BankMessageDialog />
    </div>
  );
}
