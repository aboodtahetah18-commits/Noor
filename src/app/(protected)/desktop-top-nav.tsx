'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand/brand-logo';
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

export function DesktopTopNav() {
  const pathname = usePathname();
  return (
    <aside id="namaa-desktop-sidebar" data-namaa-side="right" className="desktop-top-nav-wrap mustaqbali-sidebar namaa-wide-sidebar" dir="rtl">
      <div className="mustaqbali-sidebar-inner namaa-wide-sidebar-inner">
        <Link href="/conversations" className="namaa-wide-sidebar-brand" aria-label="نماء — مركز العمل">
          <BrandLogo surface="auto" priority />
        </Link>

        <nav className="mustaqbali-sidebar-nav namaa-wide-sidebar-nav" aria-label="التنقل الرئيسي للكمبيوتر">
          <section className="mustaqbali-nav-section">
            <p>مساحات نماء</p>
            {pages.map((item) => {
              const active = isPrimaryNavigationItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
