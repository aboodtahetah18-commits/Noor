'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { governanceCatalog } from '@/lib/governance/mobile-catalog';
import styles from './conversation-workspace.module.css';

type SheetMode='governance'|'meetings'|'documents'|null;
type Meeting={id:string;title:string;kind:string;scheduled_at:string;cadence:string;status:string;agenda?:string[];ready?:boolean;missing_data?:string[];editable?:boolean;deletable?:boolean;custom?:boolean};
type MeetingCapabilities={canCreateTemporary:boolean;canEdit:boolean;canDeleteCustom:boolean;actorRole:string;actorName:string};
type DocumentRow={id:string;file_name:string;content_type?:string|null;verification_status?:string|null;created_at?:string;room_title?:string|null};
type GovernanceRecord={id:string;sender_name:string;message_kind:string;body:string;created_at:string;room_title?:string|null};

export function GovernanceMobileSheet({
  mode,onClose,onOpenSecretary,onOpenMeetingChat,
}:{
  mode:SheetMode;
  onClose:()=>void;
  onOpenSecretary:()=>void;
  onOpenMeetingChat?:(meeting:{id:string;title:string})=>void;
}){
  const [meetings,setMeetings]=useState<Meeting[]>([]);
  const [documents,setDocuments]=useState<DocumentRow[]>([]);
  const [records,setRecords]=useState<GovernanceRecord[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [meetingEditor,setMeetingEditor]=useState<{mode:'add'|'edit';id?:string;title:string;scheduled_at:string;cadence:string;custom?:boolean}|null>(null);
  const [meetingSaving,setMeetingSaving]=useState(false);
  const [meetingDetails,setMeetingDetails]=useState<Meeting|null>(null);
  const [meetingCapabilities,setMeetingCapabilities]=useState<MeetingCapabilities|null>(null);
  const title=mode==='governance'
    ?'مركز الحوكمة المختصر'
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
        const data=await response.json() as {meetings?:Meeting[];meetingCapabilities?:MeetingCapabilities;files?:DocumentRow[];records?:GovernanceRecord[];code?:string};
        if(!response.ok) throw new Error(data.code??'UNAVAILABLE');
        if(cancelled) return;
        if(mode==='meetings'){
          setMeetings(Array.isArray(data.meetings)?data.meetings:[]);
          setMeetingCapabilities(data.meetingCapabilities??null);
          fetch('/api/conversations/files',{cache:'no-store'})
            .then(async fileResponse=>fileResponse.ok?fileResponse.json():null)
            .then(fileData=>{if(!cancelled&&fileData)setDocuments(Array.isArray(fileData.files)?fileData.files:[])})
            .catch(()=>{});
        }
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
  const meetingGroupMeta=(meeting:Meeting)=>{
    const title=meeting.title;
    if(/استثمار|الأصول/.test(title)) return {key:'assets',title:'بنك الأصول الاستثماري',logo:'/brand/bank-assets.webp'};
    if(/مراجعة|مخاطر|تعلم/.test(title)) return {key:'central',title:'بنك نماء المركزي',logo:'/brand/bank-central.webp'};
    if(/استقرار|سيولة|تمويل/.test(title)) return {key:'solvency',title:'بنك ملاءة',logo:'/brand/bank-malaa.webp'};
    if(/ميزانية|إنفاق|دورة مالية|توازن/.test(title)) return {key:'hilal',title:'بنك الهلال',logo:'/brand/bank-hilal.webp'};
    return {key:'central',title:'بنك نماء المركزي',logo:'/brand/bank-central.webp'};
  };
  const meetingGroups=useMemo(()=>{
    const groups=new Map<string,{key:string;title:string;logo:string;meetings:Meeting[]}>();
    for(const meeting of orderedMeetings){
      const meta=meetingGroupMeta(meeting);
      const current=groups.get(meta.key)??{...meta,meetings:[]};
      current.meetings.push(meeting);
      groups.set(meta.key,current);
    }
    return [...groups.values()];
  },[orderedMeetings]);
  const meetingDate=(value:string)=>new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
  async function refreshMeetings(){
    const response=await fetch('/api/governance/meetings',{cache:'no-store'});
    const data=await response.json() as {meetings?:Meeting[];meetingCapabilities?:MeetingCapabilities};
    if(!response.ok)throw new Error('meetings');
    setMeetings(Array.isArray(data.meetings)?data.meetings:[]);
    setMeetingCapabilities(data.meetingCapabilities??null);
  }
  async function saveMeeting(){
    if(!meetingEditor||meetingSaving)return;
    setMeetingSaving(true);setError('');
    try{
      const response=await fetch('/api/governance/meetings',{method:meetingEditor.mode==='add'?'POST':'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(meetingEditor)});
      if(!response.ok)throw new Error('save');
      setMeetingEditor(null);
      await refreshMeetings();
    }catch{
      setError('تعذر حفظ تعديل الاجتماع الآن.');
    }finally{
      setMeetingSaving(false);
    }
  }
  async function deleteMeeting(id:string){
    if(meetingSaving)return;
    setMeetingSaving(true);setError('');
    try{
      const response=await fetch('/api/governance/meetings',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id})});
      if(!response.ok)throw new Error('delete');
      setMeetings(current=>current.filter(meeting=>meeting.id!==id));
    }catch{
      setError('تعذر حذف الاجتماع الآن.');
    }finally{
      setMeetingSaving(false);
    }
  }
  if(!mode) return null;

  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label={title}>
    <button type="button" className={styles.scrim} aria-label="إغلاق" onClick={onClose}/>
    <aside className={styles.mobileSheet+' '+styles.mobileFullPageSheet+' '+styles.governanceSheet}>
      <div className={styles.sheetHeader}>
        <strong>{title}</strong>
        <button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button>
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
            <time dateTime={record.created_at}>{new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn',{dateStyle:'medium',timeStyle:'short'}).format(new Date(record.created_at))}</time>
          </article>)}
        </section>
        <button type="button" className={styles.primaryActionButton} onClick={onOpenSecretary}>
          <LucideIcon name="messageSquareText" size={20}/><span>مناقشة أو طلب تعديل مع أمين السر</span>
        </button>
      </div>}

      {mode==='meetings'&&<div className={styles.meetingsList}>
        <div className={styles.governanceIntro}>
          <LucideIcon name="calendarDays" size={24}/>
          <div><strong>الاجتماعات واللجان</strong><small>لا يعتبر أي اجتماع جاهزًا تلقائيًا إذا كانت بياناته الأساسية ناقصة. يمكنك تعديل الموعد أو إضافة اجتماع أو حذفه.</small></div>
        </div>
        <div className={styles.meetingsToolbar}>
          {meetingCapabilities?.canCreateTemporary&&<button type="button" className={styles.primaryActionButton} onClick={()=>setMeetingEditor({mode:'add',title:'',scheduled_at:new Date().toISOString().slice(0,16),cadence:'حسب الحاجة'})}><LucideIcon name="plus" size={16}/><span>إضافة اجتماع مؤقت</span></button>}
          {meetingCapabilities&&<small>إدارة الجدول التشغيلية باسم {meetingCapabilities.actorName}. اللجان الأساسية لا تحذف من هذه الشاشة.</small>}
        </div>
        {loading&&<p className={styles.sheetMessage}>جارٍ تحميل الاجتماعات…</p>}
        {error&&<p className={styles.sheetMessage}>{error}</p>}
        {!loading&&!error&&!orderedMeetings.length&&<p className={styles.sheetMessage}>سيظهر الجدول بعد اعتماد التأسيس الأولي.</p>}
        {meetingGroups.map(group=><section key={group.key} className={styles.meetingGroup}>
          <header className={styles.meetingGroupHeader}>
            <span className={styles.meetingGroupLogo}><Image src={group.logo} alt="" fill unoptimized sizes="72px"/></span>
            <span><strong>{group.title}</strong><small>{group.meetings.length} اجتماعات</small></span>
          </header>
          <div className={styles.meetingGroupList}>
            {group.meetings.map(meeting=><article key={meeting.id} className={styles.meetingCard}>
              <div><span>{meeting.kind}</span><strong>{meeting.title}</strong><small>{meeting.cadence}</small>{meeting.ready===false&&meeting.missing_data?.length?<p className={styles.meetingMissing}>البيانات الناقصة: {meeting.missing_data.join('، ')}</p>:null}</div>
              <time dateTime={meeting.scheduled_at}>{meeting.ready===false?'لم يحدد كاجتماع جاهز':meetingDate(meeting.scheduled_at)}</time>
              <em>{meeting.status}</em>
              <div className={styles.meetingActions}>
                {onOpenMeetingChat&&<button type="button" onClick={()=>onOpenMeetingChat({id:meeting.id,title:meeting.title})}><LucideIcon name="messageSquareText" size={16}/><span>الدردشة</span></button>}
                <button type="button" onClick={()=>setMeetingDetails(meeting)}><LucideIcon name="info" size={16}/><span>التفاصيل</span></button>
                {meetingCapabilities?.canEdit&&meeting.editable===true&&<button type="button" onClick={()=>setMeetingEditor({mode:'edit',id:meeting.id,title:meeting.title,scheduled_at:new Date(meeting.scheduled_at).toISOString().slice(0,16),cadence:meeting.cadence,custom:meeting.custom===true})} aria-label={'تعديل '+meeting.title}><LucideIcon name="pencil" size={16}/><span>تعديل</span></button>}
                {meetingCapabilities?.canDeleteCustom&&meeting.custom===true&&meeting.deletable===true&&<button type="button" onClick={()=>void deleteMeeting(meeting.id)} aria-label={'حذف '+meeting.title}><LucideIcon name="trash2" size={16}/><span>حذف</span></button>}
              </div>
            </article>)}
          </div>
        </section>)}
        {meetingDetails&&<div className={styles.meetingEditorBackdrop}><section className={styles.meetingEditorModal+' '+styles.meetingDetailsModal} role="dialog" aria-modal="true" aria-label={'تفاصيل '+meetingDetails.title}>
          <header><strong>{meetingDetails.title}</strong><button type="button" onClick={()=>setMeetingDetails(null)} aria-label="إغلاق"><LucideIcon name="x" size={16}/></button></header>
          <div className={styles.meetingDetailsBody}>
            <section><div className={styles.meetingDetailsHeading}><LucideIcon name="listChecks" size={20}/><strong>محاور الاجتماع</strong></div>{meetingDetails.agenda?.length?<ul>{meetingDetails.agenda.map((item,index)=><li key={index}>{item}</li>)}</ul>:<p>لا توجد محاور مضافة بعد.</p>}</section>
            <section><div className={styles.meetingDetailsHeading}><LucideIcon name="receiptText" size={20}/><strong>الوثائق المتاحة</strong></div>{documents.length?<div className={styles.meetingDocumentList}>{documents.slice(0,12).map(file=><span key={file.id}><b>{file.file_name}</b><small>{file.room_title||'نماء'} · {file.verification_status||'قيد المراجعة'}</small></span>)}</div>:<p>لا توجد وثائق مرفوعة بعد.</p>}</section>
            <section><div className={styles.meetingDetailsHeading}><LucideIcon name="circleCheck" size={20}/><strong>البيانات المطلوبة قبل الاجتماع</strong></div>{meetingDetails.missing_data?.length?<ul>{meetingDetails.missing_data.map(item=><li key={item}>{item}</li>)}</ul>:<p>البيانات الأساسية متوفرة لهذا الاجتماع.</p>}</section>
          </div>
          <footer>{onOpenMeetingChat&&<button type="button" className={styles.primaryActionButton} onClick={()=>{const current=meetingDetails;setMeetingDetails(null);if(current)onOpenMeetingChat({id:current.id,title:current.title})}}><LucideIcon name="messageSquareText" size={16}/><span>فتح دردشة الاجتماع</span></button>}<button type="button" className={styles.secondaryButton} onClick={()=>setMeetingDetails(null)}>إغلاق</button></footer>
        </section></div>}
        {meetingEditor&&<div className={styles.meetingEditorBackdrop}><section className={styles.meetingEditorModal} role="dialog" aria-modal="true"><header><strong>{meetingEditor.mode==='add'?'إضافة اجتماع':'تعديل الاجتماع'}</strong><button type="button" onClick={()=>setMeetingEditor(null)} aria-label="إغلاق"><LucideIcon name="x" size={16}/></button></header><div><label><span>اسم الاجتماع أو اللجنة</span><input value={meetingEditor.title} readOnly={meetingEditor.mode==='edit'&&meetingEditor.custom!==true} onChange={event=>setMeetingEditor(current=>current?{...current,title:event.target.value}:current)}/>{meetingEditor.mode==='edit'&&meetingEditor.custom!==true&&<small>اسم اللجنة الأساسية ثابت؛ تغييره يمر عبر تعديل حوكمي، ويمكن هنا تعديل الموعد والدورية فقط.</small>}</label><label><span>الموعد</span><input type="datetime-local" value={meetingEditor.scheduled_at} onChange={event=>setMeetingEditor(current=>current?{...current,scheduled_at:event.target.value}:current)}/></label><label><span>الدورية</span><select value={meetingEditor.cadence} onChange={event=>setMeetingEditor(current=>current?{...current,cadence:event.target.value}:current)}><option value="">اختر الدورية</option><option>مرة واحدة</option><option>أسبوعي</option><option>شهري</option><option>كل شهرين</option><option>ربع سنوي</option><option>نصف سنوي</option><option>سنوي</option><option>حسب الحاجة</option></select></label></div><footer><button type="button" className={styles.secondaryButton} onClick={()=>setMeetingEditor(null)}>إلغاء</button><button type="button" className={styles.primaryActionButton} disabled={meetingSaving} onClick={()=>void saveMeeting()}>{meetingSaving?'جارٍ الحفظ…':'حفظ'}</button></footer></section></div>}
        <button type="button" className={styles.secondaryButton} onClick={onOpenSecretary}>
          <LucideIcon name="messageSquareText" size={20}/><span>مناقشة جدول الاجتماعات مع أمين السر</span>
        </button>
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
          {file.created_at&&<time dateTime={file.created_at}>{new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn',{dateStyle:'short'}).format(new Date(file.created_at))}</time>}
        </article>)}
      </div>}
    </aside>
  </div>;
}
