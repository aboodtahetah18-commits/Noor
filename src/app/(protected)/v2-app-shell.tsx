'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand/brand-logo';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';
import { ProfileTrigger, type HeaderProfile } from './profile-trigger';

type NavItem={href:string;label:string;icon:LucideIconName};

const primary:NavItem[]=[
  {href:'/dashboard',label:'الرئيسية',icon:'house'},
  {href:'/accounts',label:'الحسابات',icon:'creditCard'},
  {href:'/transactions',label:'العمليات',icon:'repeat2'},
  {href:'/budget',label:'الميزانية',icon:'chart'},
  {href:'/more',label:'المزيد',icon:'layoutGrid'},
];

const secondary:NavItem[]=[
  {href:'/conversations',label:'مركز العمل',icon:'messageSquareText'},
  {href:'/reports',label:'التقارير',icon:'chart'},
  {href:'/governance',label:'المعرفة',icon:'receiptText'},
  {href:'/alerts',label:'التنبيهات',icon:'bell'},
  {href:'/settings',label:'الإعدادات',icon:'settings'},
];

function isActive(pathname:string,href:string){
  return href==='/dashboard' ? pathname==='/dashboard' : pathname===href || pathname.startsWith(href+'/');
}

export function V2AppShell({children,profile}:{children:ReactNode;profile:HeaderProfile}){
  const pathname=usePathname();
  const chat=pathname==='/conversations'||pathname.startsWith('/conversations/');
  const home=pathname==='/dashboard';
  if(chat) return <>{children}</>;

  return <div className="v2-shell" dir="rtl">
    <aside className="v2-sidebar" aria-label="التنقل الرئيسي">
      <Link href="/dashboard" className="v2-brand" aria-label="نماء — الرئيسية">
        <BrandLogo surface="auto" priority/>
      </Link>
      <nav className="v2-side-nav">
        {[...primary,...secondary].map(item=>{
          const active=isActive(pathname,item.href);
          return <Link key={item.href} href={item.href} className={active?'is-active':''}>
            <span className="v2-nav-icon"><LucideIcon name={item.icon} size={20}/></span>
            <span>{item.label}</span>
          </Link>;
        })}
      </nav>
      <div className="v2-side-profile"><ProfileTrigger profile={profile}/></div>
    </aside>

    <section className="v2-stage">
      {!home ? <header className="v2-mobile-topbar">
        <Link href="/dashboard" className="v2-mobile-brand"><BrandLogo surface="auto" priority/></Link>
        <div className="v2-mobile-actions">
          <Link href="/alerts" aria-label="التنبيهات"><LucideIcon name="bell" size={20}/></Link>
          <ProfileTrigger profile={profile}/>
        </div>
      </header>

      <main id="main-content" className="v2-content" tabIndex={-1}>{children}</main>

      <nav className="v2-mobile-nav" aria-label="التنقل الرئيسي للجوال">
        {primary.map(item=>{
          const active=isActive(pathname,item.href);
          return <Link key={item.href} href={item.href} className={active?'is-active':''}>
            <LucideIcon name={item.icon} size={24}/>
            <span>{item.label}</span>
          </Link>;
        })}
      </nav>
    </section>
  </div>;
}
