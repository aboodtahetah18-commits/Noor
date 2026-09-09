'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';

const items: Array<{href:string;label:string;icon:LucideIconName}> = [
  { href: '/dashboard', label: 'الرئيسية', icon: 'house' },
  { href: '/accounts', label: 'الحسابات', icon: 'creditCard' },
  { href: '/transactions', label: 'العمليات', icon: 'repeat2' },
  { href: '/budget', label: 'الميزانية', icon: 'chart' },
  { href: '/more', label: 'المزيد', icon: 'ellipsis' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith('/onboarding')) return null;
  return <nav className="mobile-bottom-nav mustaqbali-mobile-bottom-nav" aria-label="التنقل الرئيسي للجوال">
    {items.map((item)=>{
      const active=item.href==='/dashboard'?pathname==='/dashboard':pathname===item.href||pathname.startsWith(`${item.href}/`);
      return <Link key={item.href} href={item.href} className={active?'is-active':''} aria-current={active ? 'page' : undefined}>
        <span className="mobile-nav-icon"><LucideIcon name={item.icon} size={24}/></span>
        <span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
