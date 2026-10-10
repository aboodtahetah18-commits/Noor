'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';
import { Drawer } from '@/components/ui';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ProfileTrigger, type HeaderProfile } from './profile-trigger';

const secondary: ReadonlyArray<{ href:string; label:string; icon:LucideIconName }> = [
  { href:'/conversations', label:'مركز العمل', icon:'messageSquareText' },
  { href:'/bank-operations', label:'البنوك', icon:'landmark' },
  { href:'/investments', label:'الاستثمارات', icon:'chart' },
  { href:'/governance', label:'المعرفة', icon:'receiptText' },
  { href:'/cases', label:'القضايا والقرارات', icon:'listChecks' },
  { href:'/reports', label:'التقارير', icon:'chart' },
  { href:'/advisor', label:'مختبر الخوارزميات', icon:'sparkles' },
  { href:'/internal-funding', label:'التمويل الداخلي', icon:'banknote' },
  { href:'/workspace', label:'مركز النظام', icon:'layoutGrid' },
  { href:'/alerts', label:'التنبيهات', icon:'bell' },
  { href:'/settings', label:'الإعدادات', icon:'settings' },
];

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
        <nav className="namaa-mobile-drawer-nav" aria-label="التنقل الثانوي للمنصة">
          {secondary.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={active ? 'is-active' : ''}
                aria-current={active ? 'page' : undefined}
              >
                <span className="namaa-mobile-drawer-icon" aria-hidden="true"><LucideIcon name={icon} size={20}/></span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </Drawer>
    </>
  );
}
