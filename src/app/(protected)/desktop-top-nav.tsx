'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isPrimaryNavigationItemActive } from './navigation';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';

const pages = [
  { href: '/conversations', label: 'مركز العمل', icon: 'messageSquareText' },
  { href: '/bank-operations', label: 'البنوك', icon: 'landmark' },
  { href: '/investments', label: 'الاستثمارات', icon: 'chart' },
  { href: '/governance', label: 'المعرفة', icon: 'receiptText' },
  { href: '/cases', label: 'القرارات', icon: 'listChecks' },
  { href: '/reports', label: 'المرصد', icon: 'target' },
  { href: '/advisor', label: 'مختبر الخوارزميات', icon: 'sparkles' },
  { href: '/settings', label: 'الإعدادات', icon: 'settings' },
] satisfies Array<{ href: string; label: string; icon: LucideIconName }>;

const financePages = [
  { href: '/accounts', label: 'الحسابات', icon: 'creditCard' },
  { href: '/transactions', label: 'العمليات', icon: 'repeat2' },
  { href: '/budget', label: 'الميزانية', icon: 'chart' },
  { href: '/more', label: 'المزيد', icon: 'ellipsis' },
] satisfies Array<{ href: string; label: string; icon: LucideIconName }>;

export function DesktopTopNav() {
  const pathname = usePathname();
  const closeSidebar=()=>{
    window.localStorage.setItem('sidebarState','collapsed');
    document.documentElement.dataset.sidebar='collapsed';
    window.dispatchEvent(new Event('mustaqbali:sidebar-state'));
  };
  return (
    <aside id="namaa-desktop-sidebar" data-namaa-side="right" className="desktop-top-nav-wrap mustaqbali-sidebar namaa-wide-sidebar" dir="rtl">
      <div className="mustaqbali-sidebar-inner namaa-wide-sidebar-inner">
        <div className="namaa-wide-sidebar-head">
          <span className="namaa-wide-sidebar-title">القائمة</span>
          <button type="button" className="namaa-wide-sidebar-close" onClick={closeSidebar} aria-label="إغلاق القائمة الجانبية"><LucideIcon name="x" size={24}/></button>
        </div>

        <nav className="mustaqbali-sidebar-nav namaa-wide-sidebar-nav" aria-label="التنقل الرئيسي للكمبيوتر">
          <section className="mustaqbali-nav-section">
            <p>مساحات نماء</p>
            {pages.map((item) => {
              const active = isPrimaryNavigationItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={active ? 'is-active' : ''}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="mustaqbali-nav-icon"><LucideIcon name={item.icon} size={20} /></span>
                  <span className="mustaqbali-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </section>
          <section className="mustaqbali-nav-section">
            <p>المالية</p>
            {financePages.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={active ? 'is-active' : ''}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="mustaqbali-nav-icon"><LucideIcon name={item.icon} size={20} /></span>
                  <span className="mustaqbali-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </section>
        </nav>
      </div>
    </aside>
  );
}
