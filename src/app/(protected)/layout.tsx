import type { ReactNode } from 'react';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { hasAuthorizationAdminNavigationAccess } from '@/repositories/authorization-navigation-repository';
import { MobileBottomNav } from './mobile-bottom-nav';
import { DesktopTopNav } from './desktop-top-nav';
import { TabletTopNav } from './tablet-top-nav';
import { MobileTopBar } from './mobile-top-bar';
import { GlobalTopBar } from './global-top-bar';
import { BankMessageDialog } from '@/components/bank-message-dialog';

export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireAuthenticatedUser();
  const showAuthorizationAdmin = await hasAuthorizationAdminNavigationAccess(user.id).catch(() => false);
  return (
    <div className="protected-app-shell">
      <a className="skip-link" href="#main-content">تجاوز إلى المحتوى الرئيسي</a>
      <DesktopTopNav showAuthorizationAdmin={showAuthorizationAdmin} />
      <GlobalTopBar profile={{displayName:user.name,email:user.email,timezone:'Asia/Riyadh',emailVerified:user.emailVerified,image:user.image}} />
      <TabletTopNav />
      <MobileTopBar profile={{displayName:user.name,email:user.email,timezone:'Asia/Riyadh',emailVerified:user.emailVerified,image:user.image}} />
      <div id="main-content" tabIndex={-1} className="main-content-focus-target">{children}</div>
      <MobileBottomNav />
      <BankMessageDialog />
    </div>
  );
}
