'use client';

// CR-002 approved light logo asset: /brand/mustaqbali-logo.png

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { ThemeToggle } from '../theme-toggle';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ProfileTrigger, type HeaderProfile } from './profile-trigger';

const secondary = [
  ['/accounts','الحسابات'],['/bank-operations','العمليات البنكية'],['/internal-funding','التمويل الداخلي'],
  ['/reports','التقارير'],['/alerts','التنبيهات'],['/settings','الإعدادات'],['/workspace','مركز النظام']
] as const;

export function MobileTopBar({ profile }: { profile: HeaderProfile }) {
  const pathname=usePathname();
  const [open,setOpen]=useState(false);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const closeRef=useRef<HTMLButtonElement>(null);

  useEffect(()=>{
    if(!open) return;
    closeRef.current?.focus();
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){setOpen(false);triggerRef.current?.focus();}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[open]);

  if (pathname.startsWith('/onboarding')) return null;
  return <>
    <header className="p47-mobile-topbar mustaqbali-mobile-header" dir="rtl">
      <div className="mustaqbali-mobile-brand-zone">
        <button ref={triggerRef} className="mustaqbali-mobile-menu-trigger" type="button" onClick={()=>setOpen(true)} aria-label="فتح القائمة الجانبية" aria-haspopup="dialog" aria-expanded={open}><LucideIcon name="menu" size={24}/></button>
        <Link href="/dashboard" className="mustaqbali-mobile-brand" aria-label="مستقبلي — الرئيسية"><BrandLogo surface="dark" priority /></Link>
      </div>
      <div className="mustaqbali-mobile-header-actions">
        <ThemeToggle />
        <Link href="/alerts" aria-label="التنبيهات" title="التنبيهات"><LucideIcon name="bell" size={20}/></Link>
        <ProfileTrigger profile={profile} className="mustaqbali-mobile-profile-trigger" />
      </div>
    </header>
    {open?<div className="mustaqbali-drawer-backdrop" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget){setOpen(false);triggerRef.current?.focus();}}}>
      <aside className="mustaqbali-mobile-drawer" role="dialog" aria-modal="true" aria-label="القائمة الجانبية">
        <header><strong>مستقبلي</strong><button ref={closeRef} type="button" onClick={()=>{setOpen(false);triggerRef.current?.focus();}} aria-label="إغلاق القائمة"><LucideIcon name="x" size={20}/></button></header>
        <nav aria-label="التنقل الثانوي للجوال">
          {secondary.map(([href,label])=><Link key={href} href={href} onClick={()=>setOpen(false)} className={pathname.startsWith(href)?'is-active':''}>{label}</Link>)}
        </nav>
      </aside>
    </div>:null}
  </>;
}
