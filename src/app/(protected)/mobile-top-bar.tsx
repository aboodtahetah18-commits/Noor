'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';
import { Drawer } from '@/components/ui';
import { ThemeToggle } from '../theme-toggle';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ProfileTrigger, type HeaderProfile } from './profile-trigger';

type NavigationMode = 'system' | 'chat';

const systemPages: ReadonlyArray<{ href:string; label:string; icon:LucideIconName }> = [
  { href:'/dashboard', label:'الرئيسية', icon:'house' },
  { href:'/accounts', label:'الحسابات', icon:'creditCard' },
  { href:'/transactions', label:'العمليات', icon:'repeat2' },
  { href:'/budget', label:'الميزانية', icon:'chart' },
  { href:'/bank-operations', label:'البنوك', icon:'landmark' },
  { href:'/investments', label:'الاستثمارات', icon:'chart' },
  { href:'/reports', label:'التقارير', icon:'receiptText' },
  { href:'/settings', label:'الإعدادات', icon:'settings' },
];

export function MobileTopBar({ profile }: { profile: HeaderProfile }) {
  const pathname = usePathname();
  const chatFirst = pathname === '/conversations' || pathname.startsWith('/conversations/');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<NavigationMode>(chatFirst ? 'chat' : 'system');

  useEffect(() => {
    setMode(chatFirst ? 'chat' : 'system');
  }, [chatFirst]);

  useEffect(() => {
    const openNavigation = () => setOpen(true);
    window.addEventListener('namaa:open-responsive-navigation', openNavigation);
    return () => window.removeEventListener('namaa:open-responsive-navigation', openNavigation);
  }, []);

  const handleModeChange = (next: NavigationMode) => {
    setMode(next);
  };

  return (
    <>
      {!chatFirst && (
        <header className="namaa-mobile-topbar namaa-mobile-header namaa-responsive-topbar" dir="rtl">
          <div className="namaa-mobile-brand-zone">
            <button
              className="namaa-mobile-menu-trigger"
              type="button"
              onClick={() => setOpen(true)}
              aria-label="فتح التنقل بين المنصة"
              aria-haspopup="dialog"
              aria-expanded={open}
            >
              <LucideIcon name="menu" size={24} />
            </button>
            <Link href="/dashboard" className="namaa-mobile-brand" aria-label="نماء — الرئيسية">
              <BrandLogo surface="dark" priority />
            </Link>
          </div>

          <div className="namaa-mobile-header-actions">
            <Link href="/alerts" className="namaa-responsive-alert" aria-label="التنبيهات" title="التنبيهات">
              <LucideIcon name="bell" size={20} />
            </Link>
            <ThemeToggle />
            <ProfileTrigger profile={profile} className="namaa-mobile-profile-trigger" />
          </div>
        </header>
      )}

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="التنقل بين المنصة"
        side="start"
        className="namaa-mobile-navigation-drawer namaa-responsive-navigation-drawer"
      >
        <div className="namaa-responsive-navigation-content" dir="rtl">
          <label className="namaa-navigation-mode">
            <span>التنقل بين المنصة</span>
            <select
              value={mode}
              onChange={(event) => handleModeChange(event.target.value as NavigationMode)}
              aria-label="اختيار نوع التنقل"
            >
              <option value="system">صفحات النظام</option>
              <option value="chat">الدردشة</option>
            </select>
          </label>

          {mode === 'system' ? (
            <nav className="namaa-mobile-drawer-nav namaa-responsive-drawer-nav" aria-label="صفحات النظام">
              {systemPages.map(({ href, label, icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
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
          ) : (
            <div className="namaa-chat-navigation-entry">
              <Link href="/conversations" onClick={() => setOpen(false)}>
                <span className="namaa-mobile-drawer-icon" aria-hidden="true">
                  <LucideIcon name="messageSquareText" size={20}/>
                </span>
                <span>
                  <strong>الدردشة</strong>
                  <small>جهات الاتصال ومراكز العمل</small>
                </span>
              </Link>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}
