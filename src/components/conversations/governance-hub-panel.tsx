'use client';

import { useEffect, useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import styles from './conversation-workspace.module.css';

type Policy={id:string;title:string;domain:string;status:string;summary:string};
type Committee={id:string;name:string;cadence:string;emergency:string};
type Overview={
  onboarding:{complete:boolean;completed_at:string|null;first_council_meeting_at:string|null};
  policies:Policy[];
  committees:Committee[];
  capabilities:string[];
};

function formatDate(value:string|null){
  if(!value)return 'يُحدد بعد اعتماد التأسيس الأولي';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return 'موعد غير متاح';
  return new Intl.DateTimeFormat('ar-SA',{
    dateStyle:'medium',
    timeStyle:'short',
    timeZone:'Asia/Riyadh',
  }).format(date);
}

export function GovernanceHubPanel({
  mode,
  onCompose,
}:{
  mode:'governance'|'secretary';
  onCompose:(text:string)=>void;
}){
  const [data,setData]=useState<Overview|null>(null);
  const [error,setError]=useState('');
  const [expanded,setExpanded]=useState<string|null>(null);

  useEffect(()=>{
    let cancelled=false;
    fetch('/api/governance/overview',{cache:'no-store'})
      .then(async response=>{
        if(!response.ok)throw new Error('overview');
        return response.json() as Promise<Overview>;
      })
      .then(result=>{if(!cancelled)setData(result)})
      .catch(()=>{if(!cancelled)setError('تعذر تحميل مركز الحوكمة والاجتماعات الآن.')});
    return()=>{cancelled=true};
  },[]);

  const nextMeeting=useMemo(()=>formatDate(data?.onboarding.first_council_meeting_at??null),[data]);

  if(error)return <section className={styles.governanceHubError} role="alert">{error}</section>;
  if(!data)return <section className={styles.governanceHubLoading}>جارٍ تجهيز السجلات والاجتماعات…</section>;

  if(mode==='secretary'){
    return <section className={styles.governanceHub} aria-label="الاجتماعات والمحاضر">
      <header className={styles.governanceHubHeader}>
        <div>
          <small>أمين السر المركزي</small>
          <strong>الاجتماعات والمحاضر والمتابعة</strong>
        </div>
        <span><LucideIcon name="calendarDays" size={16}/>مجدول</span>
      </header>

      <article className={styles.firstMeetingCard}>
        <div>
          <small>الاجتماع التأسيسي لمجلس نماء الأعلى</small>
          <strong>{nextMeeting}</strong>
          <p>بعد 24 ساعة من اعتماد التأسيس الأولي: تعارف مع المستخدم، مراجعة الصورة المالية، ومعايرة احتياجات الخوارزميات وطريقة تدخلها وشرحها.</p>
        </div>
        <button type="button" onClick={()=>onCompose('أريد مراجعة جدول أعمال الاجتماع التأسيسي وإضافة موضوع.')}>
          <LucideIcon name="messageSquareText" size={16}/>
          <span>إضافة موضوع</span>
        </button>
      </article>

      <div className={styles.committeeSchedule}>
        <header><strong>الدورية المعتمدة للجان</strong><small>الطارئ يضيف جلسة ولا يلغي الدوري</small></header>
        {data.committees.map(item=><article key={item.id}>
          <span><LucideIcon name="calendarDays" size={16}/></span>
          <div><strong>{item.name}</strong><small>{item.cadence}</small><p>{item.emergency}</p></div>
        </article>)}
      </div>

      <div className={styles.governanceQuickActions}>
        <button type="button" onClick={()=>onCompose('اعرض لي آخر المحاضر والقرارات التي تحتاج متابعتي.')}><LucideIcon name="receiptText" size={16}/><span>آخر المحاضر</span></button>
        <button type="button" onClick={()=>onCompose('أريد طلب اجتماع لمناقشة موضوع جديد.')}><LucideIcon name="plus" size={16}/><span>طلب اجتماع</span></button>
      </div>
    </section>;
  }

  return <section className={styles.governanceHub} aria-label="مركز الحوكمة والسياسات">
    <header className={styles.governanceHubHeader}>
      <div>
        <small>مركز الحوكمة والسياسات والسجلات</small>
        <strong>السياسات والصلاحيات والآليات والمحاضر</strong>
      </div>
      <span><LucideIcon name="lockKeyhole" size={16}/>مرجع حاكم</span>
    </header>

    <div className={styles.governanceCapabilities}>
      {data.capabilities.map(item=><span key={item}><LucideIcon name="circleCheck" size={16}/>{item}</span>)}
    </div>

    <div className={styles.policyList}>
      {data.policies.map(policy=>{
        const open=expanded===policy.id;
        return <article key={policy.id} className={styles.policyCard}>
          <button type="button" onClick={()=>setExpanded(open?null:policy.id)} aria-expanded={open}>
            <span>
              <small>{policy.domain} · {policy.id}</small>
              <strong>{policy.title}</strong>
            </span>
            <LucideIcon name={open?'chevronUp':'chevronDown'} size={16}/>
          </button>
          {open&&<div className={styles.policyCardBody}>
            <p>{policy.summary}</p>
            <div>
              <span><LucideIcon name="circleCheck" size={16}/>{policy.status}</span>
              <button type="button" onClick={()=>onCompose(`أريد مناقشة وتطوير السياسة ${policy.id}: ${policy.title}`)}>
                <LucideIcon name="messageSquareText" size={16}/>
                <span>مناقشة التعديل</span>
              </button>
            </div>
          </div>}
        </article>;
      })}
    </div>

    <div className={styles.governanceQuickActions}>
      <button type="button" onClick={()=>onCompose('اعرض لي مصفوفة الصلاحيات كاملة مع المالك وحدود الاعتماد.')}><LucideIcon name="listChecks" size={16}/><span>مصفوفة الصلاحيات</span></button>
      <button type="button" onClick={()=>onCompose('اعرض لي سجل الإصدارات والمحاضر المرتبطة بأحدث تعديلات الحوكمة.')}><LucideIcon name="receiptText" size={16}/><span>الإصدارات والمحاضر</span></button>
    </div>
  </section>;
}
