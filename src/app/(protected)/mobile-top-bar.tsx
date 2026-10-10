'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { Drawer } from '@/components/ui';
import { PlatformNavigationLinks } from '@/components/navigation/platform-navigation-links';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ProfileTrigger, type HeaderProfile } from './profile-trigger';


export function MobileTopBar({ profile }: { profile: HeaderProfile }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const chatFirst = pathname === '/conversations' || pathname.startsWith('/conversations/');

  if (chatFirst) return null;

  return (
    <>
      <header className="namaa-mobile-topbar namaa-mobile-header" dir="rtl">
        <div className="namaa-mobile-brand-zone">
          <button
            className="namaa-mobile-menu-trigger"
            type="button"
            onClick={() => setOpen(true)}
            aria-label="فتح القائمة الجانبية"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <LucideIcon name="menu" size={24} />
          </button>
          <Link href="/dashboard" className="namaa-mobile-brand" aria-label="نماء — الرئيسية">
            <BrandLogo surface="auto" priority />
          </Link>
        </div>

        <div className="namaa-mobile-header-actions">
          <Link href="/transactions" className="namaa-mobile-search-action" aria-label="البحث في نماء" title="البحث">
            <LucideIcon name="search" size={20} />
          </Link>
          <Link href="/alerts" aria-label="التنبيهات" title="التنبيهات">
            <LucideIcon name="bell" size={20} />
          </Link>
          <ProfileTrigger profile={profile} className="namaa-mobile-profile-trigger" />
        </div>
      </header>

      <Drawer open={open} onOpenChange={setOpen} title="القائمة" side="start" className="namaa-mobile-navigation-drawer">
        <PlatformNavigationLinks className="namaa-mobile-drawer-nav" pathname={pathname} onNavigate={() => setOpen(false)}/>
      </Drawer>
    </>
  );
}
