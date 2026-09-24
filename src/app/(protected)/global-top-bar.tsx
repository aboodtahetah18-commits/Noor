'use client';

import Link from 'next/link';
import { useEffect, useSyncExternalStore } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { ProfileTrigger, type HeaderProfile } from './profile-trigger';
import { ThemeToggle } from '../theme-toggle';
import { BrandLogo } from '@/components/brand/brand-logo';

function subscribeSidebar(callback:()=>void){
  const onStorage=(event:StorageEvent)=>{if(event.key==='sidebarState')callback();};
  window.addEventListener('storage',onStorage);
  window.addEventListener('mustaqbali:sidebar-state',callback);
  return()=>{window.removeEventListener('storage',onStorage);window.removeEventListener('mustaqbali:sidebar-state',callback);};
}
function sidebarSnapshot(){return window.localStorage.getItem('sidebarState')!=='expanded';}
function sidebarServerSnapshot(){return true;}

export function GlobalTopBar({profile}:{profile:HeaderProfile}){
  const collapsed=useSyncExternalStore(subscribeSidebar,sidebarSnapshot,sidebarServerSnapshot);
  useEffect(()=>{document.documentElement.dataset.sidebar=collapsed?'collapsed':'expanded';return()=>{delete document.documentElement.dataset.sidebar;};},[collapsed]);
    const toggleSidebar=()=>{
    const next=!collapsed;
    window.localStorage.setItem('sidebarState',next?'collapsed':'expanded');
    document.documentElement.dataset.sidebar=next?'collapsed':'expanded';
    window.dispatchEvent(new Event('mustaqbali:sidebar-state'));
  };
  return <header className="mustaqbali-topbar namaa-topbar" dir="rtl">
    <div className="mustaqbali-topbar-brand-zone">
      <button type="button" className="mustaqbali-topbar-menu" onClick={toggleSidebar} aria-label={collapsed?'توسيع القائمة الجانبية':'طي القائمة الجانبية'}><LucideIcon name="menu" size={20}/></button>
      <Link href="/dashboard" className="mustaqbali-topbar-logo" aria-label="نماء — الرئيسية"><BrandLogo surface="auto" priority /></Link>
    </div>
    <form action="/transactions" method="get" className="mustaqbali-global-search" role="search">
      <LucideIcon name="search" size={20}/>
      <input name="search" aria-label="ابحث في نماء" placeholder="ابحث في نماء…" />
    </form>
    <div className="mustaqbali-topbar-actions">
      <ProfileTrigger profile={profile} className="mustaqbali-profile-trigger" />
      <Link href="/conversations" aria-label="الدردشة"><LucideIcon name="messageSquareText" size={20}/></Link>
      <Link href="/alerts" aria-label="التنبيهات"><LucideIcon name="bell" size={20}/></Link>
      <ThemeToggle />
    </div>
  </header>;
}
