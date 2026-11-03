import type { ReactNode } from 'react';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { MobileBottomNav } from './mobile-bottom-nav';
import { DesktopTopNav } from './desktop-top-nav';
import { TabletTopNav } from './tablet-top-nav';
import { MobileTopBar } from './mobile-top-bar';
import { GlobalTopBar } from './global-top-bar';
import { BankMessageDialog } from '@/components/bank-message-dialog';
import { FinancialFormIntelligence } from '@/components/forms/financial-form-intelligence';
import { getCurrentFinancialCycle } from '@/features/cycles/queries/get-current-cycle';
import { getAlertCenter, type AlertItem } from '@/features/alerts/queries/get-alert-center';
import { IconOnlyActions } from '@/components/ui/icon-only-actions';

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

  const cycle = await getCurrentFinancialCycle(user.id).catch(() => null);
  let notifications: AlertItem[] = [];
  let notificationsUnavailable = false;
  try {
    notifications = (await getAlertCenter(user.id, cycle?.id ?? null)).visible;
  } catch {
    notificationsUnavailable = true;
  }

  return (
    <div className="protected-app-shell" data-responsive-platform="full">
      <FinancialFormIntelligence />
      <IconOnlyActions />
      <a className="skip-link" href="#main-content">تجاوز إلى المحتوى الرئيسي</a>

      <DesktopTopNav />
      <GlobalTopBar profile={profile} notifications={notifications} notificationsUnavailable={notificationsUnavailable} />
      <TabletTopNav profile={profile} notifications={notifications} notificationsUnavailable={notificationsUnavailable} />
      <MobileTopBar profile={profile} notifications={notifications} notificationsUnavailable={notificationsUnavailable} />

      <main id="main-content" tabIndex={-1} className="namaa-app-main main-content-focus-target">
        <div className="namaa-page-frame">
          {children}
        </div>
      </main>

      <MobileBottomNav />
      <BankMessageDialog />
    </div>
  );
}
