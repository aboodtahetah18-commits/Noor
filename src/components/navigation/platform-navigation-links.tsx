'use client';

import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { PLATFORM_NAVIGATION } from '@/lib/navigation/platform-navigation';

/** Shared destination list. Each host drawer owns its own open/close state. */
export function PlatformNavigationLinks({ pathname, onNavigate, className }: {
  pathname?: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return <nav className={className} aria-label="التنقل في منصة نماء" dir="rtl">
    {PLATFORM_NAVIGATION.map(({href,label,icon})=>{
      const active=pathname===href || (href!=='/dashboard' && pathname?.startsWith(href+'/'));
      return <Link key={href} href={href} onClick={onNavigate} aria-current={active?'page':undefined} className={active?'is-active':''}>
        <span className="namaa-unified-nav-icon" aria-hidden="true"><LucideIcon name={icon} size={20}/></span>
        <span>{label}</span>
      </Link>;
    })}
  </nav>;
}
