'use client';

import { useEffect, useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { governanceCatalog } from '@/lib/governance/mobile-catalog';
import styles from './conversation-workspace.module.css';

type Meeting={
  id:string;
  title:string;
  kind:string;
  scheduled_at:string;
  cadence:string;
  status:string;
};

export function GovernanceMobileSheet({
  mode,
  onClose,
  onOpenSecretary,
}:{
  mode:'governance'|'meetings'|null;
  onClose:()=>void;
  onOpenSecretary:()=>void;
}){
  const [meetings,setMeetings]=useState<Meeting[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const title=mode==='governance'?'مركز الحوكمة والسياسات':'الاجتماعات واللجان';

  useEffect(()=>{
    if(mode!=='meetings') return;
    let cancelled=false;
    setLoading(true);
    setError('');
    fetch('/api/governance/meetings',{cache:'no-store'})
      .then(async response=>{
        const data=await response.json() as {meetings?:Meeting[];code?:string};
        if(!response.ok) throw new Error(data.code??'MEETINGS_UNAVAILABLE');
        if(!cancelled) setMeetings(Array.isArray(data.meetings)?data.meetings:[]);
      })
      .catch(()=>{if(!cancelled)setError('تعذر تحميل جدول الاجتماعات الآن.')})
      .finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[mode]);

  const ordered=useMemo(()=>[...meetings].sort((a,b)=>new Date(a.scheduled_at).getTime()-new Date(b.scheduled_at).getTime()),[meetings]);
  if(!mode) return null;

  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label={title}>
    <button type="button" className={styles.scrim} aria-label="إغلاق" onClick={onClose}/>
    <aside className={styles.mobileSheet+' '+styles.governanceSheet}>
      <div className={styles.sheetHeader}>
        <strong>{title}</strong>
        <button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button>
      </div>

      {mode==='governance'
        ? <div className={styles.governanceCards}>
            <div className={styles.governanceIntro}>
              <LucideIcon name="landmark" size={24}/>
              <div><strong>المرجع الحاكم للمستخدم</strong><small>يمكنك فتح النصوص والآليات والمحاضر، ثم طلب مناقشة أي فقرة مع أمين السر.</small></div>
            </div>
            {governanceCatalog.map(item=><details key={item.id} className={styles.governanceCard}>
              <summary>
                <span><strong>{item.title}</strong><small>{item.summary}</small></span>
                <LucideIcon name="chevronDown" size={18}/>
              </summary>
              <div className={styles.governanceBody}>
                <span><small>المالك</small><strong>{item.owner}</strong></span>
                <span><small>الحالة</small><strong>{item.status} · {item.version}</strong></span>
                <ul>{item.details.map(detail=><li key={detail}>{detail}</li>)}</ul>
              </div>
            </details>)}
            <button type="button" className={styles.primaryActionButton} onClick={onOpenSecretary}>
              <LucideIcon name="messageSquareText" size={20}/><span>مناقشة مع أمين السر</span>
            </button>
          </div>
        : <div className={styles.meetingsList}>
            <div className={styles.governanceIntro}>
              <LucideIcon name="calendarDays" size={24}/>
              <div><strong>تقويم حوكمي غير عشوائي</strong><small>الاجتماعات الدورية تبقى قائمة، وأي طارئ يضاف ولا يلغي الموعد التالي.</small></div>
            </div>
            {loading&&<p className={styles.sheetMessage}>جارٍ تحميل الاجتماعات…</p>}
            {error&&<p className={styles.sheetMessage}>{error}</p>}
            {!loading&&!error&&!ordered.length&&<p className={styles.sheetMessage}>سيظهر الجدول بعد اعتماد التأسيس الأولي.</p>}
            {ordered.map(meeting=><article key={meeting.id} className={styles.meetingCard}>
              <div><span>{meeting.kind}</span><strong>{meeting.title}</strong><small>{meeting.cadence}</small></div>
              <time dateTime={meeting.scheduled_at}>{new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(meeting.scheduled_at))}</time>
              <em>{meeting.status}</em>
            </article>)}
            <button type="button" className={styles.secondaryButton} onClick={onOpenSecretary}>
              <LucideIcon name="messageSquareText" size={18}/><span>اطلب إضافة موضوع أو اجتماع</span>
            </button>
          </div>}
    </aside>
  </div>;
}
