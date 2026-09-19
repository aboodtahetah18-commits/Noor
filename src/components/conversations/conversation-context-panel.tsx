'use client';

import { useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { governedRoomDetails } from '@/lib/conversations/governed-room-details';
import styles from './conversation-workspace.module.css';

type RoomKey='central'|'solvency'|'assets'|'hilal'|'advisor'|'council';
type Attachment={id:string;file_name:string;content_type?:string|null;verification_status?:string|null;created_at?:string};
type Fact={key:string;label:string;raw:string;verified_at?:string;confidence:number};
type Participant={participant_key:string;display_name:string;participant_type:string;role_label?:string};

const stepLabels:Record<string,string>={
  marital_status:'الحالة الاجتماعية',
  dependents:'أفراد الأسرة والمعالون',
  home_city:'مدينة السكن',
  housing:'السكن',
  employment:'العمل',
  work_city:'مدينة العمل',
  commute:'التنقل',
  income:'الراتب والدخل',
  accounts:'الحسابات المالية',
  obligations:'الالتزامات',
  goals:'الأهداف المالية',
  statements:'كشوف الحساب',
  review:'مراجعة بيانات التأسيس',
  complete:'مكتمل',
};

function PermissionSummary({roomKey}:{roomKey:RoomKey}){
  const detail=governedRoomDetails[roomKey];
  if(roomKey==='central'){
    return <div className={styles.contextPermissionList}>
      <span><b>يراقب</b><em>جلسة التأسيس والقضايا الاستراتيجية وتقدم اكتمال الملف.</em></span>
      <span><b>يحلل</b><em>الصورة الشمولية ويقيّم اكتمال بيانات المستخدم قبل التوصية.</em></span>
      <span><b>يوصي</b><em>بالسؤال التالي والتوصية العليا عند القضايا الاستراتيجية أو التعارض.</em></span>
      <span><b>يعتمد</b><em>مؤسسيًا حسب الحالة فقط، ولا يعتمد حركة نقدية بدل المستخدم.</em></span>
      <span><b>ينفذ</b><em>يدير حوار التأسيس ويطلب البيانات؛ لا يحرك أموال المستخدم.</em></span>
    </div>;
  }
  return <div className={styles.contextPermissionList}>
    <span><b>المسؤولية</b><em>{detail.responsibility}</em></span>
    <span><b>يراقب</b><em>{detail.observes}</em></span>
    <span><b>يتدخل</b><em>{detail.intervention}</em></span>
    <span><b>لا يتدخل</b><em>{detail.avoids}</em></span>
  </div>;
}

export function ConversationContextPanel({
  roomKey,
  participants,
  attachments,
  facts,
  onboardingStep,
  onboardingComplete,
  messageCount,
  latestMessage,
}:{
  roomKey:RoomKey;
  participants:Participant[];
  attachments:Attachment[];
  facts:Fact[];
  onboardingStep:string|null;
  onboardingComplete:boolean|null;
  messageCount:number;
  latestMessage?:string|null;
}){
  const [tab,setTab]=useState<'governor'|'files'|'analysis'>('governor');
  const detail=governedRoomDetails[roomKey];

  const analysis=useMemo(()=>{
    const state=onboardingComplete===true
      ? 'ملف التأسيس الأساسي مكتمل.'
      : onboardingComplete===false
        ? 'ملف التأسيس ما زال قيد الاستكمال.'
        : 'حالة التأسيس لم تُحمّل بعد.';
    const need=onboardingComplete===true
      ? 'لا توجد خطوة تأسيس أساسية مفتوحة حاليًا.'
      : onboardingStep
        ? `المطلوب الآن: ${stepLabels[onboardingStep]??onboardingStep}.`
        : 'المطلوب الآن لم يُحدد بعد.';
    return {state,need};
  },[onboardingComplete,onboardingStep]);

  return <div className={styles.contextWorkspace}>
    <nav className={styles.contextTabs} aria-label="أقسام سياق المحادثة">
      <button type="button" className={tab==='governor'?styles.contextTabActive:''} onClick={()=>setTab('governor')}>المحافظ</button>
      <button type="button" className={tab==='files'?styles.contextTabActive:''} onClick={()=>setTab('files')}>الملفات</button>
      <button type="button" className={tab==='analysis'?styles.contextTabActive:''} onClick={()=>setTab('analysis')}>السياق والتحليل</button>
    </nav>

    {tab==='governor'&&<div className={styles.contextTabPanel}>
      <section className={styles.contextHero}>
        <div><small>{detail.entityTitle}</small><strong>{detail.roleTitle}</strong></div>
        <span>{participants.length||1} مشارك فعلي</span>
      </section>
      <section className={styles.contextSection}>
        <small>المهام والاختصاص</small>
        <p>{detail.responsibility}</p>
      </section>
      <section className={styles.contextSection}>
        <small>الصلاحيات وحدود الدور</small>
        <PermissionSummary roomKey={roomKey}/>
      </section>
      <section className={styles.contextSection}>
        <small>قاعدة الحوكمة</small>
        <p>{detail.governanceNote}</p>
      </section>
      <section className={styles.contextSection}>
        <small>ما يحتاجه منك الآن</small>
        <p>{analysis.need}</p>
      </section>
    </div>}

    {tab==='files'&&<div className={styles.contextTabPanel}>
      <section className={styles.contextSection}>
        <small>الملفات المشتركة في هذه المحادثة</small>
        {attachments.length?<div className={styles.contextFiles}>{attachments.map(file=><article key={file.id}>
          <LucideIcon name="receiptText" size={20}/>
          <div><strong>{file.file_name}</strong><small>{file.verification_status||'قيد المراجعة'}</small></div>
        </article>)}</div>:<div className={styles.contextEmpty}><LucideIcon name="receiptText" size={24}/><span>لا توجد ملفات مشتركة مسجلة حتى الآن.</span></div>}
      </section>
    </div>}

    {tab==='analysis'&&<div className={styles.contextTabPanel}>
      <section className={styles.contextAnalysisGrid}>
        <span><small>حالة الملف</small><strong>{analysis.state}</strong></span>
        <span><small>الرسائل</small><strong>{messageCount}</strong></span>
        <span><small>الحقائق المسجلة</small><strong>{facts.length}</strong></span>
        <span><small>الملفات</small><strong>{attachments.length}</strong></span>
      </section>
      <section className={styles.contextSection}>
        <small>ما وصلنا إليه</small>
        <p>{analysis.state} {analysis.need}</p>
        {latestMessage&&<p className={styles.contextLatest}>آخر تطور في المحادثة: {latestMessage}</p>}
      </section>
      <section className={styles.contextSection}>
        <small>البيانات المسجلة</small>
        {facts.length?<div className={styles.contextFacts}>{facts.map(fact=><article key={fact.key}>
          <small>{fact.label}</small>
          <strong>{fact.raw||'—'}</strong>
        </article>)}</div>:<p>لا توجد حقائق تأسيسية محفوظة لعرضها حاليًا.</p>}
      </section>
      <section className={styles.contextSection}>
        <small>ملاحظات أحتاج الرجوع لها</small>
        <div className={styles.contextNotes}>
          <p>{detail.governanceNote}</p>
          <p>أي حركة مالية خارجية تبقى بيد المستخدم، ولا تُعد منفذة بمجرد التوصية أو التأكيد داخل الدردشة.</p>
          {onboardingComplete===false&&<p>التشغيل الكامل يبقى مقيدًا إلى أن يكتمل الحد الأدنى المطلوب من بيانات التأسيس.</p>}
        </div>
      </section>
      <p className={styles.contextAnalysisFootnote}>هذا ملخص وصفي من حالة المحادثة والذاكرة الحالية؛ لا ينشئ قرارًا ماليًا جديدًا.</p>
    </div>}
  </div>;
}
