'use client';

import { useEffect, useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { Button } from '@/components/ui';
import { governanceCatalog } from '@/lib/governance/mobile-catalog';
import styles from './conversation-workspace.module.css';

type SheetMode='governance'|'meetings'|'documents'|null;
type Meeting={id:string;title:string;kind:string;scheduled_at:string;cadence:string;status:string};
type DocumentRow={id:string;file_name:string;content_type?:string|null;verification_status?:string|null;created_at?:string;room_title?:string|null};
type GovernanceRecord={id:string;sender_name:string;message_kind:string;body:string;created_at:string;room_title?:string|null};

export function GovernanceMobileSheet({
  mode,onClose,onOpenSecretary,
}:{
  mode:SheetMode;
  onClose:()=>void;
  onOpenSecretary:()=>void;
}){
  const [meetings,setMeetings]=useState<Meeting[]>([]);
  const [documents,setDocuments]=useState<DocumentRow[]>([]);
  const [records,setRecords]=useState<GovernanceRecord[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const title=mode==='governance'
    ?'مركز الحوكمة والسياسات'
    :mode==='meetings'
      ?'الاجتماعات واللجان'
      :'الوثائق والسجلات';

  useEffect(()=>{
    if(!mode) return;
    let cancelled=false;
    queueMicrotask(()=>{if(!cancelled){setLoading(true);setError('')}});
    const endpoint=mode==='meetings'
      ?'/api/governance/meetings'
      :mode==='documents'
        ?'/api/conversations/files'
        :'/api/governance/records';
    fetch(endpoint,{cache:'no-store'})
      .then(async response=>{
        const data=await response.json() as {meetings?:Meeting[];files?:DocumentRow[];records?:GovernanceRecord[];code?:string};
        if(!response.ok) throw new Error(data.code??'UNAVAILABLE');
        if(cancelled) return;
        if(mode==='meetings') setMeetings(Array.isArray(data.meetings)?data.meetings:[]);
        if(mode==='documents') setDocuments(Array.isArray(data.files)?data.files:[]);
        if(mode==='governance') setRecords(Array.isArray(data.records)?data.records:[]);
      })
      .catch(()=>{
        if(cancelled) return;
        setError(mode==='meetings'?'تعذر تحميل جدول الاجتماعات الآن.':mode==='documents'?'تعذر تحميل الوثائق الآن.':'تعذر تحميل المحاضر الآن.');
      })
      .finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[mode]);

  const orderedMeetings=useMemo(()=>[...meetings].sort((a,b)=>new Date(a.scheduled_at).getTime()-new Date(b.scheduled_at).getTime()),[meetings]);
  if(!mode) return null;

  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label={title}>
    <button type="button" className={styles.scrim} aria-label="إغلاق" onClick={onClose}/>
    <aside className={styles.mobileSheet+' '+styles.governanceSheet+' ux-dialog-surface namaa-governance-dialog'}>
      <div className={styles.sheetHeader}>
        <strong>{title}</strong>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></Button>
      </div>

      {mode==='governance'&&<div className={styles.governanceCards}>
        <div className={styles.governanceIntro}>
          <LucideIcon name="landmark" size={24}/>
          <div><strong>المرجع الحاكم للمستخدم</strong><small>كل قاعدة قابلة للعرض والمراجعة، والتعديل يمر بمسار موثق ويحفظ النسخة السابقة.</small></div>
        </div>
        {governanceCatalog.map(item=><details key={item.id} className={styles.governanceCard}>
          <summary><span><strong>{item.title}</strong><small>{item.summary}</small></span><LucideIcon name="chevronDown" size={16}/></summary>
          <div className={styles.governanceBody}>
            <span><small>المالك</small><strong>{item.owner}</strong></span>
            <span><small>الحالة</small><strong>{item.status} · {item.version}</strong></span>
            <ul>{item.details.map(detail=><li key={detail}>{detail}</li>)}</ul>
          </div>
        </details>)}
        <section className={styles.recordsBlock}>
          <div className={styles.recordsHeader}><div><strong>المحاضر والسجلات الأخيرة</strong><small>مرتبطة بالمجلس وأمين السر</small></div><LucideIcon name="receiptText" size={20}/></div>
          {loading&&<p className={styles.sheetMessage}>جارٍ تحميل المحاضر…</p>}
          {error&&<p className={styles.sheetMessage}>{error}</p>}
          {!loading&&!error&&!records.length&&<p className={styles.sheetMessage}>لا توجد محاضر مسجلة للمستخدم بعد.</p>}
          {records.slice(0,8).map(record=><article key={record.id} className={styles.recordCard}>
            <div><strong>{record.room_title||record.sender_name}</strong><small>{record.sender_name}</small></div>
            <p>{record.body}</p>
            <time dateTime={record.created_at}>{new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(record.created_at))}</time>
          </article>)}
        </section>
        <Button type="button" variant="primary" onClick={onOpenSecretary}>
          <LucideIcon name="messageSquareText" size={20}/><span>مناقشة أو طلب تعديل مع أمين السر</span>
        </Button>
      </div>}

      {mode==='meetings'&&<div className={styles.meetingsList}>
        <div className={styles.governanceIntro}>
          <LucideIcon name="calendarDays" size={24}/>
          <div><strong>تقويم حوكمي غير عشوائي</strong><small>الاجتماعات الدورية مرتبطة بالدورة المالية، وأي طارئ يضاف ولا يلغي الموعد التالي.</small></div>
        </div>
        {loading&&<p className={styles.sheetMessage}>جارٍ تحميل الاجتماعات…</p>}
        {error&&<p className={styles.sheetMessage}>{error}</p>}
        {!loading&&!error&&!orderedMeetings.length&&<p className={styles.sheetMessage}>سيظهر الجدول بعد اعتماد التأسيس الأولي.</p>}
        {orderedMeetings.map(meeting=><article key={meeting.id} className={styles.meetingCard}>
          <div><span>{meeting.kind}</span><strong>{meeting.title}</strong><small>{meeting.cadence}</small></div>
          <time dateTime={meeting.scheduled_at}>{new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(meeting.scheduled_at))}</time>
          <em>{meeting.status}</em>
        </article>)}
        <Button type="button" variant="secondary" onClick={onOpenSecretary}>
          <LucideIcon name="messageSquareText" size={20}/><span>اطلب إضافة موضوع أو اجتماع</span>
        </Button>
      </div>}

      {mode==='documents'&&<div className={styles.documentsList}>
        <div className={styles.governanceIntro}>
          <LucideIcon name="receiptText" size={24}/>
          <div><strong>الوثائق المرتبطة بالمحادثات</strong><small>تظهر الملفات مع الجهة وحالة التحقق دون تحويل المرفق إلى تنفيذ مالي تلقائي.</small></div>
        </div>
        {loading&&<p className={styles.sheetMessage}>جارٍ تحميل الوثائق…</p>}
        {error&&<p className={styles.sheetMessage}>{error}</p>}
        {!loading&&!error&&!documents.length&&<p className={styles.sheetMessage}>لا توجد وثائق مرفوعة بعد.</p>}
        {documents.map(file=><article key={file.id} className={styles.documentCard}>
          <LucideIcon name="receiptText" size={20}/>
          <div><strong>{file.file_name}</strong><small>{file.room_title||'محادثات نماء'} · {file.verification_status||'قيد المراجعة'}</small></div>
          {file.created_at&&<time dateTime={file.created_at}>{new Intl.DateTimeFormat('ar-SA',{dateStyle:'short'}).format(new Date(file.created_at))}</time>}
        </article>)}
      </div>}
    </aside>
  </div>;
}
