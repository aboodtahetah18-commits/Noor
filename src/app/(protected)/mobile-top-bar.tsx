'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';
import { Drawer } from '@/components/ui';
import { ThemeToggle } from '../theme-toggle';
import { ProfileTrigger, type HeaderProfile } from './profile-trigger';

const systemPages: ReadonlyArray<{ href:string; label:string; icon:LucideIconName }> = [
  { href:'/dashboard', label:'الرئيسية', icon:'house' },
  { href:'/conversations', label:'مركز المحادثات', icon:'messageSquareText' },
  { href:'/accounts', label:'الحسابات', icon:'creditCard' },
  { href:'/transactions', label:'العمليات', icon:'repeat2' },
  { href:'/budget', label:'الميزانية', icon:'chart' },
  { href:'/bank-operations', label:'البنوك', icon:'landmark' },
  { href:'/investments', label:'الاستثمارات', icon:'chart' },
  { href:'/reports', label:'التقارير', icon:'receiptText' },
  { href:'/settings', label:'الإعدادات', icon:'settings' },
];

function currentPageTitle(pathname:string){
  if(pathname==='/dashboard') return '';
  if(pathname==='/cycles/new'||pathname.startsWith('/cycles/new/')) return 'بداية الدورة';
  const item=systemPages.find(({href})=>pathname===href||pathname.startsWith(`${href}/`));
  return item?.label ?? 'نماء';
}

export function MobileTopBar({ profile }: { profile: HeaderProfile }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pageTitle=currentPageTitle(pathname);
  const chatFirst = pathname === '/conversations' || pathname.startsWith('/conversations/');

  useEffect(() => {
    const openNavigation = () => setOpen(true);
    window.addEventListener('namaa:open-responsive-navigation', openNavigation);
    return () => window.removeEventListener('namaa:open-responsive-navigation', openNavigation);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const closeNavigation = () => setOpen(false);

  return (
    <>
      {!chatFirst ? <header className="namaa-mobile-topbar namaa-mobile-header namaa-responsive-topbar" dir="rtl">
          <div className="namaa-responsive-topbar-start">
          <button
            className="namaa-mobile-menu-trigger"
            type="button"
            onClick={() => setOpen(true)}
            aria-label="فتح قائمة المنصة"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <LucideIcon name="menu" size={20} />
          </button>
            <Link href="/dashboard" className="namaa-mobile-brand-logo namaa-mobile-brand-mark-only" aria-label="نماء — الرئيسية">
              <Image src="/brand/ndos/namaa-mark.svg" alt="" width={34} height={38} priority unoptimized />
            </Link>
          </div>

          {pageTitle ? <strong className="namaa-responsive-page-title">{pageTitle}</strong> : null}

          <div className="namaa-mobile-header-actions">
            <Link href="/alerts" className="namaa-responsive-alert" aria-label="التنبيهات" title="التنبيهات">
              <LucideIcon name="bell" size={20} />
            </Link>
            <ThemeToggle />
            <ProfileTrigger profile={profile} className="namaa-mobile-profile-trigger" />
          </div>
        </header> : null}

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="قائمة المنصة"
        side="end"
        className="namaa-mobile-navigation-drawer namaa-responsive-navigation-drawer"
        showCloseButton={false}
      >
        <nav
          className="namaa-mobile-drawer-nav namaa-responsive-drawer-nav"
          aria-label="صفحات النظام"
          onClickCapture={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest('a')) closeNavigation();
          }}
        >
          {systemPages.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeNavigation}
                className={active ? 'is-active' : ''}
                aria-current={active ? 'page' : undefined}
              >
                <span className="namaa-mobile-drawer-icon" aria-hidden="true">
                  <LucideIcon name={icon} size={20}/>
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </Drawer>
    </>
  );
}
