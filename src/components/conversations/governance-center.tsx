'use client';

import { useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { committeeCadence, foundingCouncilMeetingAt, governanceSections } from '@/lib/governance/namaa-governance-catalog';
import styles from './governance-center.module.css';

export function GovernanceCenter({
  open,
  onClose,
  onboardingCompletedAt,
  onOpenSecretary,
}:{open:boolean;onClose:()=>void;onboardingCompletedAt?:string|null;onOpenSecretary:()=>void}){
  const [activeId,setActiveId]=useState(governanceSections[0]?.id??'policies');
  const section=governanceSections.find(item=>item.id===activeId)??governanceSections[0];
  const foundingMeeting=useMemo(()=>foundingCouncilMeetingAt(onboardingCompletedAt),[onboardingCompletedAt]);
  if(!open||!section)return null;
  const foundingText=foundingMeeting
    ? new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(foundingMeeting)
    : 'بعد 24 ساعة من اعتماد التأسيس الأولي';

  return <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="مركز الحوكمة والسياسات">
    <button className={styles.scrim} type="button" aria-label="إغلاق" onClick={onClose}/>
    <aside className={styles.sheet} dir="rtl">
      <header className={styles.header}>
        <div><small>مرجعك الحاكم داخل نماء</small><strong>مركز الحوكمة والسياسات</strong></div>
        <button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button>
      </header>

      <section className={styles.meetingCard}>
        <span className={styles.icon}><LucideIcon name="calendarDays" size={20}/></span>
        <div><small>أول اجتماع مجلس</small><strong>{foundingText}</strong><p>مراجعة فهم المجلس لك، احتياجات الخوارزميات، مستوى التدخل، والأسئلة التي تحتاج معايرة.</p></div>
      </section>

      <nav className={styles.tabs} aria-label="أقسام الحوكمة">
        {governanceSections.map(item=><button key={item.id} type="button" className={item.id===section.id?styles.active:''} onClick={()=>setActiveId(item.id)}>{item.title}</button>)}
      </nav>

      <section className={styles.sectionIntro}><div><small>القسم الحالي</small><h2>{section.title}</h2></div><p>{section.description}</p></section>
      <div className={styles.cards}>
        {section.items.map((item,index)=><details key={`${section.id}-${item.title}-${index}`} className={styles.card} open={index===0}>
          <summary><span><strong>{item.title}</strong>{item.meta&&<small>{item.meta}</small>}</span><LucideIcon name="chevronDown" size={18}/></summary>
          <p>{item.body}</p>
          <button type="button" onClick={onOpenSecretary}><LucideIcon name="messagesSquare" size={16}/><span>ناقش هذه الفقرة مع أمين السر</span></button>
        </details>)}
      </div>

      {section.id==='committees'&&<section className={styles.schedule}>
        <header><small>الجدول الدوري</small><strong>الطارئ يضاف ولا يلغي الدوري</strong></header>
        {committeeCadence.map(item=><div key={item.name}><span><strong>{item.name}</strong><small>{item.cadence}</small></span><em>{item.emergency}</em></div>)}
      </section>}

      <footer className={styles.footer}>
        <button type="button" className={styles.primary} onClick={onOpenSecretary}><LucideIcon name="messagesSquare" size={18}/><span>اسأل أمين السر أو اطلب اجتماعًا</span></button>
        <small>التعديل الحاكم يمر بمراجعة وإصدار جديد؛ لا تُمحى النسخة التاريخية.</small>
      </footer>
    </aside>
  </div>;
}
