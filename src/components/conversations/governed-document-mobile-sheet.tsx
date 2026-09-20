'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import type { GovernedDocumentRef } from '@/lib/conversations/governed-room-details';
import styles from './conversation-workspace.module.css';

type Amendment={
  requestId:string; documentRef:string; documentTitle:string; roomKey:string;
  clauseRef:string|null; currentRule:string|null; proposedRule:string; rationale:string;
  priority:'NORMAL'|'NEXT_MEETING'|'URGENT'; status:string; requestedAt:string;
  governorReviewedAt:string|null; secretaryReceivedAt:string|null; councilDecisionAt:string|null;
  councilDecisionId:string|null; effectiveAt:string|null; nextVersion:string|null; discussionNotes:string[];
};

const statusLabel:Record<string,string>={
  GOVERNOR_REVIEW:'مراجعة المحافظ', SECRETARY_INTAKE:'لدى أمين السر',
  COUNCIL_DISCUSSION:'مناقشة مجلس نماء', APPROVED_PENDING_EFFECTIVE:'معتمد وينتظر النفاذ',
  EFFECTIVE:'نافذ', REJECTED:'مرفوض',
};
const priorityLabel={NORMAL:'عادي',NEXT_MEETING:'للاجتماع القادم',URGENT:'عاجل — اجتماع فوري'} as const;

export function GovernedDocumentMobileSheet({document,roomKey,onClose}:{document:GovernedDocumentRef;roomKey:string;onClose:()=>void}){
  const [amendments,setAmendments]=useState<Amendment[]>([]);
  const [formOpen,setFormOpen]=useState(false);
  const [pending,setPending]=useState(false);
  const [feedback,setFeedback]=useState('');
  const [clauseRef,setClauseRef]=useState('');
  const [currentRule,setCurrentRule]=useState('');
  const [proposedRule,setProposedRule]=useState('');
  const [rationale,setRationale]=useState('');
  const [priority,setPriority]=useState<'NORMAL'|'NEXT_MEETING'|'URGENT'>('NEXT_MEETING');

  async function load(){
    const response=await fetch('/api/governance/amendments',{cache:'no-store'});
    const data=await response.json().catch(()=>({})) as {amendments?:Amendment[]};
    if(response.ok) setAmendments(Array.isArray(data.amendments)?data.amendments:[]);
  }
  useEffect(()=>{
    let cancelled=false;
    queueMicrotask(()=>{if(!cancelled) void load()});
    return()=>{cancelled=true};
  },[]);
  const related=useMemo(()=>amendments.filter(item=>item.documentRef===document.referenceCode),[amendments,document.referenceCode]);

  async function submit(event:FormEvent){
    event.preventDefault(); if(pending)return; setPending(true); setFeedback('');
    try{
      const response=await fetch('/api/governance/amendments',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({operation:'CREATE',documentRef:document.referenceCode,documentTitle:document.title,roomKey,
          clauseRef:clauseRef.trim()||null,currentRule:currentRule.trim()||null,proposedRule:proposedRule.trim(),rationale:rationale.trim(),priority}),
      });
      const data=await response.json().catch(()=>({})) as {requestId?:string;error?:string};
      if(!response.ok) throw new Error(data.error||'REQUEST_FAILED');
      setFeedback('تم فتح طلب التعديل '+(data.requestId??'')+' لدى المحافظ للمناقشة الأولية.');
      setFormOpen(false); setClauseRef(''); setCurrentRule(''); setProposedRule(''); setRationale(''); await load();
    }catch{ setFeedback('تعذر فتح طلب التعديل الآن.'); } finally{ setPending(false); }
  }

  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label={'تفاصيل '+document.title}>
    <button type="button" className={styles.scrim} aria-label="إغلاق" onClick={onClose}/>
    <aside className={styles.mobileSheet+' '+styles.governedDocumentSheet}>
      <div className={styles.sheetHeader}><strong>تفاصيل المرجع الحاكم</strong><button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>
      <div className={styles.governedDocumentContent}>
        <section className={styles.governedDocumentHero}>
          <div><span>{document.referenceCode}</span><strong>{document.title}</strong><small>{document.version?'الإصدار '+document.version:'إصدار نافذ بحسب المرجع المعتمد'}</small></div>
          <LucideIcon name={document.kind==='record'?'listChecks':'landmark'} size={24}/>
        </section>

        <details className={styles.governedDocumentSection} open>
          <summary><span>المرجع والنفاذ</span><LucideIcon name="chevronDown" size={16}/></summary>
          <div><p>الرقم المرجعي: <b>{document.referenceCode}</b></p><p>النوع: <b>{document.kind}</b></p><p>الحالة: <b>مرجع نافذ ما لم يوجد قرار تعديل معتمد بتاريخ نفاذ لاحق.</b></p>
          {document.sourceUrl&&<a href={document.sourceUrl} target="_blank" rel="noreferrer">فتح النسخة الأصلية في Google Drive</a>}</div>
        </details>

        <details className={styles.governedDocumentSection}>
          <summary><span>الأبواب والبنود</span><LucideIcon name="chevronDown" size={16}/></summary>
          <div>{document.sections?.length
            ?document.sections.map(section=><article key={section.ref}><b>{section.ref} — {section.title}</b><p>{section.summary}</p></article>)
            :<p>سيظهر هنا النص الداخلي المرقم عند استيراد بنود هذه الوثيقة إلى سجل نماء المرجعي. لا يتم اختلاق أي بند غير موجود في المرجع الأصلي.</p>}</div>
        </details>

        <details className={styles.governedDocumentSection} open>
          <summary><span>طلبات التعديل والمناقشة</span><LucideIcon name="chevronDown" size={16}/></summary>
          <div className={styles.governedAmendmentList}>
            {!related.length&&<p>لا توجد طلبات تعديل مرتبطة بهذا المرجع حتى الآن.</p>}
            {related.map(item=><article key={item.requestId} className={styles.governedAmendmentCard}>
              <header><strong>{item.requestId}</strong><span>{statusLabel[item.status]??item.status}</span></header>
              <small>{priorityLabel[item.priority]}</small>
              {item.clauseRef&&<p><b>البند:</b> {item.clauseRef}</p>}<p><b>المقترح:</b> {item.proposedRule}</p><p><b>السبب:</b> {item.rationale}</p>
              {item.discussionNotes.length>0&&<div>{item.discussionNotes.map((note,index)=><p key={index}>• {note}</p>)}</div>}
              {item.councilDecisionId&&<p><b>قرار المجلس:</b> {item.councilDecisionId}</p>}{item.nextVersion&&<p><b>الإصدار الجديد:</b> {item.nextVersion}</p>}{item.effectiveAt&&<p><b>تاريخ النفاذ:</b> {item.effectiveAt}</p>}
            </article>)}
          </div>
        </details>

        {!formOpen?<button type="button" className={styles.primaryActionButton} onClick={()=>setFormOpen(true)}><LucideIcon name="pencil" size={20}/><span>طلب تعديل هذا المرجع</span></button>
        :<form className={styles.governedAmendmentForm} onSubmit={submit}>
          <strong>طلب تعديل — يبدأ بمراجعة المحافظ</strong>
          <label><span>رقم البند أو المادة</span><input value={clauseRef} onChange={e=>setClauseRef(e.target.value)} placeholder="مثال: المادة 4.2"/></label>
          <label><span>النص أو الوضع الحالي</span><textarea value={currentRule} onChange={e=>setCurrentRule(e.target.value)} placeholder="اختياري — اكتب النص الحالي الذي تريد مراجعته"/></label>
          <label><span>التعديل المقترح</span><textarea required value={proposedRule} onChange={e=>setProposedRule(e.target.value)} placeholder="اكتب التعديل المقترح بدقة"/></label>
          <label><span>مبرر التعديل</span><textarea required value={rationale} onChange={e=>setRationale(e.target.value)} placeholder="لماذا نحتاج هذا التعديل؟ وما أثره المتوقع؟"/></label>
          <label><span>الأولوية</span><select value={priority} onChange={e=>setPriority(e.target.value as typeof priority)}><option value="NORMAL">عادي</option><option value="NEXT_MEETING">للاجتماع القادم</option><option value="URGENT">عاجل — اجتماع فوري</option></select></label>
          <p>المسار: المحافظ → أمين السر → مجلس نماء الأعلى → اعتماد/رفض → تاريخ نفاذ وإصدار جديد.</p>
          <div className={styles.governedAmendmentActions}><button type="button" onClick={()=>setFormOpen(false)}>إلغاء</button><button type="submit" disabled={pending}>{pending?'جارٍ الإرسال…':'إرسال للمحافظ'}</button></div>
        </form>}
        {feedback&&<p className={styles.governedDocumentFeedback}>{feedback}</p>}
      </div>
    </aside>
  </div>;
}
