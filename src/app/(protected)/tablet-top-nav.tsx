'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { ThemeToggle } from '../theme-toggle';
import { BrandLogo } from '@/components/brand/brand-logo';

const items=[
  ['/dashboard','الرئيسية'],['/transactions','الحركة المالية'],['/budget','التخطيط'],['/goals','الأهداف'],['/advisor','المستشار'],['/more','المزيد']
] as const;

export function TabletTopNav(){
  const pathname=usePathname();
  if(pathname.startsWith('/onboarding')) return null;
  return <header className="tablet-top-nav-wrap mustaqbali-tablet-wrap">
    <div className="mustaqbali-tablet-topbar" dir="rtl">
      <Link href="/dashboard" className="mustaqbali-tablet-brand" aria-label="مستقبلي — الرئيسية"><BrandLogo surface="dark" priority /></Link>
      <form action="/transactions" method="get" className="mustaqbali-tablet-search" role="search"><LucideIcon name="search" size={20}/><input name="search" aria-label="ابحث في مستقبلي" placeholder="ابحث في مستقبلي…"/></form>
      <div className="mustaqbali-tablet-actions"><ThemeToggle /><Link href="/alerts" className="mustaqbali-tablet-action" aria-label="التنبيهات"><LucideIcon name="bell" size={20}/></Link></div>
    </div>
    <nav className="mustaqbali-tablet-nav" aria-label="التنقل الرئيسي للتابلت">
      {items.map(([href,label])=>{const active=href==='/dashboard'?pathname==='/dashboard':pathname.startsWith(href);return <Link key={href} href={href} className={active?'is-active':''} aria-current={active?'page':undefined}>{label}</Link>;})}
    </nav>
  </header>;
}
