'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { ThemeToggle } from '../theme-toggle';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ProfileTrigger, type HeaderProfile } from './profile-trigger';

const items = [
  ['/dashboard', 'الرئيسية'],
  ['/conversations', 'مركز العمل'],
  ['/bank-operations', 'البنوك'],
  ['/investments', 'الاستثمارات'],
  ['/governance', 'المعرفة'],
  ['/cases', 'القرارات'],
  ['/reports', 'المرصد'],
  ['/advisor', 'المختبر'],
] as const;

export function TabletTopNav({ profile }: { profile: HeaderProfile }) {
  const pathname = usePathname();

  return (
    <header className="tablet-top-nav-wrap mustaqbali-tablet-wrap namaa-tablet-wrap namaa-wide-tablet" dir="rtl">
      <div className="namaa-tablet-topbar">
        <Link href="/dashboard" className="namaa-tablet-brand" aria-label="نماء — الرئيسية">
          <BrandLogo surface="auto" priority />
        </Link>

        <form action="/transactions" method="get" className="namaa-tablet-search" role="search">
          <LucideIcon name="search" size={20} />
          <input name="search" aria-label="ابحث في نماء" placeholder="ابحث في نماء…" />
        </form>

        <div className="namaa-tablet-actions">
          <Link href="/alerts" className="namaa-tablet-action" aria-label="التنبيهات">
            <LucideIcon name="bell" size={20} />
          </Link>
          <ThemeToggle />
          <ProfileTrigger profile={profile} className="mustaqbali-tablet-profile-trigger" />
        </div>
      </div>

      <nav className="namaa-tablet-nav namaa-wide-tablet-nav" aria-label="التنقل الرئيسي للتابلت">
        {items.map(([href, label]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>
              {label}
            </Link>
          );
        })}
        <Link href="/settings" className={pathname.startsWith('/settings') ? 'is-active' : ''} aria-current={pathname.startsWith('/settings') ? 'page' : undefined}>
          الإعدادات
        </Link>
      </nav>
    </header>
  );
}
