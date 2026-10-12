'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { Drawer } from '@/components/ui';
import { PlatformNavigationLinks } from '@/components/navigation/platform-navigation-links';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ProfileTrigger, type HeaderProfile } from './profile-trigger';


export function MobileTopBar({ profile }: { profile: HeaderProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const parts = pathname.split('/').filter(Boolean);
  const subAction = parts.some(part => ['new','edit','details','view'].includes(part));
  const isSubpage = subAction || (/^\/(transactions|accounts|obligations|goals|investments|internal-funding|emergency|savings)\/[^/]+/.test(pathname));
  const parentHref = '/' + (parts[0] || 'dashboard');
  const actionTitle = parts.includes('new') ? 'إضافة' : parts.includes('edit') ? 'تعديل' : 'تفاصيل';
  const entityTitle = ({transactions:'عملية',accounts:'حساب',obligations:'التزام',goals:'هدف',investments:'استثمار','internal-funding':'تمويل',emergency:'صندوق الطوارئ',savings:'ادخار'} as Record<string,string>)[parts[0]] ?? 'السجل';
  const subpageTitle = subAction ? `${actionTitle} ${entityTitle}` : entityTitle;
  const chatFirst = pathname === '/conversations' || pathname.startsWith('/conversations/');
  const [open, setOpen] = useState(false);
  const pageTitle = pathname === '/transactions' ? 'العمليات' : pathname === '/accounts' ? 'الحسابات' : pathname === '/budget' ? 'الميزانية' : pathname === '/more' ? 'المزيد' : pathname === '/dashboard' ? 'الرئيسية' : null;
  if (chatFirst) return null;
  return (
    <>
      <header className={`namaa-mobile-topbar namaa-mobile-header ${isSubpage ? "namaa-mobile-header--subpage" : ""}`} dir="rtl">
        <div className="namaa-mobile-brand-zone">
          <button
            className="namaa-mobile-menu-trigger"
            type="button"
            onClick={() => { if (isSubpage) { if (window.history.length > 1) router.back(); else router.push(parentHref); } else setOpen(true); }}
            aria-label={isSubpage ? 'الرجوع إلى الصفحة السابقة' : 'فتح القائمة الجانبية'}
            aria-haspopup={isSubpage ? undefined : 'dialog'}
            aria-expanded={isSubpage ? undefined : open}
          >
            <LucideIcon name={isSubpage ? "chevronRight" : "menu"} size={24} />
          </button>
          <Link href="/dashboard" className="namaa-mobile-brand" aria-label="نماء — الرئيسية">
            <BrandLogo surface="auto" priority />
          </Link>
        </div>

        {isSubpage ? <strong className="namaa-mobile-header-page-title">{subpageTitle}</strong> : pageTitle ? <strong className="namaa-mobile-header-page-title">{pageTitle}</strong> : null}
        <div className="namaa-mobile-header-actions">
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
