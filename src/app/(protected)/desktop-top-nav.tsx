'use client';

// Sidebar persistence is owned by GlobalTopBar: localStorage.setItem('sidebarState', ...)

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isPrimaryNavigationItemActive } from './navigation';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';

const sections = [
  {
    label: 'إدارة المال',
    items: [
      { href: '/dashboard', label: 'الرئيسية', icon: 'house' },
      { href: '/transactions', label: 'الحركة المالية', icon: 'receiptText' },
      { href: '/budget', label: 'التخطيط والميزانية', icon: 'walletCards' },
      { href: '/goals', label: 'الأهداف', icon: 'target' },
      { href: '/obligations', label: 'الالتزامات', icon: 'creditCard' },
      { href: '/internal-funding', label: 'التمويل الداخلي', icon: 'banknote' },
    ],
  },
  {
    label: 'التحليل والقرار',
    items: [
      { href: '/reports', label: 'التقارير', icon: 'chart' },
      { href: '/advisor', label: 'المستشار الذكي', icon: 'sparkles' },
      { href: '/alerts', label: 'التنبيهات', icon: 'bell' },
    ],
  },
] satisfies Array<{label:string;items:Array<{href:string;label:string;icon:LucideIconName}>}>;

export function DesktopTopNav() {
  const pathname = usePathname();
  if (pathname.startsWith('/onboarding')) return null;
  return (
    <aside className="desktop-top-nav-wrap mustaqbali-sidebar" dir="rtl">
      <div className="mustaqbali-sidebar-inner">
        <nav className="mustaqbali-sidebar-nav" aria-label="التنقل الرئيسي للكمبيوتر">
          {sections.map((section)=><section key={section.label} className="mustaqbali-nav-section">
            <p>{section.label}</p>
            {section.items.map((item)=>{
              const active=isPrimaryNavigationItemActive(pathname,item.href);
              return <Link key={item.href} href={item.href} className={active?'is-active':''} aria-current={active?'page':undefined}>
                <span className="mustaqbali-nav-icon"><LucideIcon name={item.icon} size={20}/></span>
                <span className="mustaqbali-nav-label">{item.label}</span>
              </Link>;
            })}
          </section>)}
        </nav>

        <div className="mustaqbali-sidebar-footer">
          <Link href="/more" className={pathname.startsWith('/more')?'is-active':''}><LucideIcon name="ellipsis" size={20}/><span>المزيد</span></Link>
          <Link href="/settings" className={pathname.startsWith('/settings')?'is-active':''}><LucideIcon name="settings" size={20}/><span>الإعدادات</span></Link>
        </div>
      </div>
    </aside>
  );
}
