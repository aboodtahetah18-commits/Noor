'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@/app/theme-toggle';
import { LucideIcon } from '@/components/ui/lucide-icon';
import styles from './settings.module.css';

type SettingsPayload={
  user:{id:string;name:string;email:string|null;image:string|null};
  onboarding_complete:boolean;
  profile:{display_name?:string|null;base_currency?:string|null;timezone?:string|null}|null;
  contact_profile:{first_name?:string|null;last_name?:string|null;phone?:string|null;city?:string|null}|null;
  operational_settings:{matching_tolerance_days:number;policy_ref:string;allowed_values:number[]}|null;
  accounts:Array<{
    id:string;name:string;account_type:string;bank_name?:string|null;financial_role?:string|null;
    currency?:string|null;is_active:boolean;opening_balance?:string|number|null;opening_balance_date?:string|null;
  }>;
};

type Section='profile'|'appearance'|'accounts'|'matching'|'help';

function money(value:string|number|null|undefined){
  const amount=Number(value??0);
  return new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(Number.isFinite(amount)?amount:0);
}

export function SettingsClient(){
  const router=useRouter();
  const search=useSearchParams();
  const requested=search.get('section');
  const [data,setData]=useState<SettingsPayload|null>(null);
  const [section,setSection]=useState<Section>(
    requested==='profile'||requested==='appearance'||requested==='accounts'||requested==='matching'||requested==='help'
      ? requested
      : 'profile'
  );
  const [name,setName]=useState('');
  const [tolerance,setTolerance]=useState(2);
  const [savingProfile,setSavingProfile]=useState(false);
  const [savingTolerance,setSavingTolerance]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    let cancelled=false;
    fetch('/api/account/settings',{cache:'no-store'})
      .then(async response=>{
        if(!response.ok) throw new Error('settings');
        return response.json() as Promise<SettingsPayload>;
      })
      .then(payload=>{
        if(cancelled)return;
        setData(payload);
        setName(payload.user.name||'');
        setTolerance(payload.operational_settings?.matching_tolerance_days??2);
        if(!payload.onboarding_complete) setSection(current=>current==='accounts'||current==='matching'?'profile':current);
      })
      .catch(()=>{if(!cancelled)setMessage('تعذر تحميل الإعدادات الآن.');});
    return()=>{cancelled=true};
  },[]);

  const sections=useMemo(()=>{
    const base:Array<{id:Section;label:string;icon:'circleUserRound'|'moon'|'walletCards'|'slidersHorizontal'|'info'}>=[
      {id:'profile',label:'الملف الشخصي',icon:'circleUserRound'},
      {id:'appearance',label:'المظهر',icon:'moon'},
    ];
    if(data?.onboarding_complete){
      base.push({id:'accounts',label:'الحسابات',icon:'walletCards'});
      base.push({id:'matching',label:'المطابقة',icon:'slidersHorizontal'});
    }
    base.push({id:'help',label:'المساعدة',icon:'info'});
    return base;
  },[data?.onboarding_complete]);

  async function saveProfile(){
    if(name.trim().length<2||savingProfile)return;
    setSavingProfile(true);
    setMessage('');
    try{
      const response=await fetch('/api/account/profile',{
        method:'PATCH',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({name:name.trim()}),
      });
      if(!response.ok) throw new Error('profile');
      setMessage('تم حفظ الاسم.');
    }catch{
      setMessage('تعذر حفظ الاسم الآن.');
    }finally{
      setSavingProfile(false);
    }
  }

  async function saveTolerance(){
    if(!data?.onboarding_complete||savingTolerance)return;
    setSavingTolerance(true);
    setMessage('');
    try{
      const response=await fetch('/api/account/settings',{
        method:'PATCH',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({matching_tolerance_days:tolerance}),
      });
      const result=await response.json() as {code?:string};
      if(!response.ok) throw new Error(result.code??'settings');
      setMessage('تم حفظ إعداد المطابقة.');
    }catch{
      setMessage('تعذر حفظ إعداد المطابقة الآن.');
    }finally{
      setSavingTolerance(false);
    }
  }

  async function logout(){
    try{await fetch('/api/auth/logout',{method:'POST'});}finally{
      router.push('/login');
      router.refresh();
    }
  }

  return <main className={styles.page} dir="rtl">
    <header className={styles.topbar}>
      <Link href="/dashboard" className={styles.back}><LucideIcon name="chevronRight" size={20}/><span>المحادثات</span></Link>
      <div><strong>الإعدادات</strong><small>إعدادات الحساب والواجهة</small></div>
      <button type="button" className={styles.logoutTop} onClick={()=>void logout()}><LucideIcon name="logOut" size={20}/><span>خروج</span></button>
    </header>

    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="أقسام الإعدادات">
        {sections.map(item=><button key={item.id} type="button" onClick={()=>setSection(item.id)} className={section===item.id?styles.active:''}>
          <LucideIcon name={item.icon} size={20}/><span>{item.label}</span>
        </button>)}
      </nav>

      <section className={styles.content}>
        {!data&&<div className={styles.card}><p>جارٍ تحميل الإعدادات…</p></div>}

        {data&&section==='profile'&&<div className={styles.card}>
          <header><strong>الملف الشخصي</strong><small>بيانات العرض الأساسية لحسابك.</small></header>
          <label><span>الاسم</span><input value={name} onChange={event=>setName(event.target.value)} maxLength={120}/></label>
          <label><span>البريد الإلكتروني</span><input value={data.user.email??''} readOnly/></label>
          <div className={styles.metaGrid}>
            <div><small>المدينة</small><strong>{data.contact_profile?.city||'غير محددة'}</strong></div>
            <div><small>المنطقة الزمنية</small><strong>{data.profile?.timezone||'Asia/Riyadh'}</strong></div>
            <div><small>العملة الأساسية</small><strong>{data.profile?.base_currency||'SAR'}</strong></div>
          </div>
          <p className={styles.note}>تغيير البريد أو كلمة المرور يمر عبر مسار أمان الحساب، وليس من شاشة الإعدادات العامة.</p>
          <button type="button" className={styles.primary} onClick={()=>void saveProfile()} disabled={savingProfile||name.trim().length<2}>{savingProfile?'جارٍ الحفظ…':'حفظ الاسم'}</button>
        </div>}

        {data&&section==='appearance'&&<div className={styles.card}>
          <header><strong>المظهر</strong><small>إعداد واجهة فقط، ولا يغير أي منطق مالي.</small></header>
          <div className={styles.settingRow}><span><strong>الوضع الفاتح أو الداكن</strong><small>يطبق على واجهة نماء.</small></span><ThemeToggle/></div>
        </div>}

        {data&&section==='accounts'&&data.onboarding_complete&&<div className={styles.card}>
          <header><strong>الحسابات</strong><small>عرض الحسابات المسجلة ضمن ملفك. التعديل المالي يتم عبر المحافظ لضمان بقاء المصدر والتدقيق واضحين.</small></header>
          <div className={styles.accountList}>
            {data.accounts.length?data.accounts.map(account=><article key={account.id}>
              <div><strong>{account.name}</strong><small>{account.bank_name||account.account_type}</small></div>
              <span>{money(account.opening_balance)} {account.currency||'SAR'}</span>
            </article>):<p>لا توجد حسابات مسجلة حاليًا.</p>}
          </div>
          <Link href="/dashboard" className={styles.secondary}><LucideIcon name="messageSquareText" size={16}/><span>العودة للمحافظ لإضافة أو تعديل حساب</span></Link>
        </div>}

        {data&&section==='matching'&&data.onboarding_complete&&data.operational_settings&&<div className={styles.card}>
          <header><strong>هامش مطابقة التاريخ</strong><small>الإعداد الوحيد التشغيلي القابل للتخصيص المعتمد حاليًا في هذا القسم.</small></header>
          <div className={styles.settingRow}>
            <span><strong>فرق تاريخ التنفيذ والترحيل البنكي</strong><small>يستخدم مع المبلغ والحساب والاتجاه والمرجع؛ التاريخ وحده لا يكفي للمطابقة.</small></span>
            <select value={tolerance} onChange={event=>setTolerance(Number(event.target.value))}>
              {data.operational_settings.allowed_values.map(value=><option key={value} value={value}>±{value} أيام</option>)}
            </select>
          </div>
          <div className={styles.policy}><small>المرجع الحاكم</small><strong>{data.operational_settings.policy_ref}</strong></div>
          <button type="button" className={styles.primary} onClick={()=>void saveTolerance()} disabled={savingTolerance}>{savingTolerance?'جارٍ الحفظ…':'حفظ إعداد المطابقة'}</button>
        </div>}

        {data&&section==='help'&&<div className={styles.card}>
          <header><strong>المساعدة</strong><small>حدود نماء وطريقة استخدامه.</small></header>
          <div className={styles.helpGrid}>
            <section><strong>التنفيذ المالي</strong><p>نماء يحلل ويوصي ويتابع. التحويل والسداد والاستثمار الخارجي ينفذها المستخدم ثم يثبتها للمطابقة.</p></section>
            <section><strong>البيانات الناقصة</strong><p>إذا كانت معلومة جوهرية ناقصة أو متعارضة، يخفض نماء الثقة أو يوقف الحكم بدل التخمين.</p></section>
            <section><strong>أثناء التأسيس</strong><p>تبقى الميزات التشغيلية مقيدة حتى يكتمل الحد الأدنى من بيانات التأسيس.</p></section>
          </div>
        </div>}

        {message&&<div className={styles.message} role="status">{message}</div>}
      </section>
    </div>
  </main>;
}
