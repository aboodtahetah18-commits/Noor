'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { Drawer } from '@/components/ui';
import { ThemeToggle } from '../theme-toggle';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ProfileTrigger, type HeaderProfile } from './profile-trigger';

const secondary = [
  ['/conversations','مركز العمل'],
  ['/bank-operations','البنوك'],
  ['/investments','الاستثمارات'],
  ['/governance','المعرفة'],
  ['/cases','القضايا والقرارات'],
  ['/reports','التقارير'],
  ['/advisor','مختبر الخوارزميات'],
  ['/internal-funding','التمويل الداخلي'],
  ['/workspace','مركز النظام'],
  ['/alerts','التنبيهات'],
  ['/settings','الإعدادات'],
] as const;

export function MobileTopBar({ profile }: { profile: HeaderProfile }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="p47-mobile-topbar mustaqbali-mobile-header namaa-mobile-header" dir="rtl">
        <div className="mustaqbali-mobile-brand-zone">
          <button
            className="mustaqbali-mobile-menu-trigger"
            type="button"
            onClick={() => setOpen(true)}
            aria-label="فتح القائمة الجانبية"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <LucideIcon name="menu" size={24} />
          </button>
          <Link href="/dashboard" className="mustaqbali-mobile-brand" aria-label="نماء — الرئيسية">
            <BrandLogo surface="auto" priority />
          </Link>
        </div>

        <div className="mustaqbali-mobile-header-actions">
          <Link href="/transactions" className="mustaqbali-mobile-search-action" aria-label="البحث في نماء" title="البحث">
            <LucideIcon name="search" size={20} />
          </Link>
          <Link href="/alerts" aria-label="التنبيهات" title="التنبيهات">
            <LucideIcon name="bell" size={20} />
          </Link>
          <ThemeToggle />
          <ProfileTrigger profile={profile} className="mustaqbali-mobile-profile-trigger" />
        </div>
      </header>

      <Drawer open={open} onOpenChange={setOpen} title="القائمة" side="end" className="namaa-mobile-navigation-drawer">
        <nav className="namaa-mobile-drawer-nav" aria-label="التنقل الثانوي للجوال">
          {secondary.map(([href, label]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={active ? 'is-active' : ''}
                aria-current={active ? 'page' : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </Drawer>
    </>
  );
}
