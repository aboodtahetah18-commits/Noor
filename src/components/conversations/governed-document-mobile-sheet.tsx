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
const kindLabel:Record<string,string>={charter:'ميثاق',policy:'سياسة',record:'سجل',reference:'مرجع',contract:'عقد حاكم'};
const arabicDigits=(value:string)=>value.replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]??d).replaceAll('.', '٫');
const displayVersion=(value?:string|null)=>value?arabicDigits(value.replace(/^v/i,'')):'معتمد';
const arabicVisibleText=(value:string)=>value
  .replace(/RBAC/gi,'التحكم بالصلاحيات حسب الدور')
  .replace(/ABAC/gi,'التحكم بالصلاحيات حسب السمات')
  .replace(/API/gi,'واجهة برمجية')
  .replace(/KPI/gi,'مؤشر أداء')
  .replace(/AI/gi,'الذكاء الاصطناعي')
  .replace(/Hard Guards/gi,'الضوابط الصارمة')
  .replace(/[A-Za-z][A-Za-z0-9_.\/-]*/g,'')
  .replace(/\s{2,}/g,' ')
  .trim();

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
  const [embeddedSections,setEmbeddedSections]=useState<Array<{title:string;lines:string[]}>>([]);
  const [contentLoading,setContentLoading]=useState(true);

  async function load(){
    const response=await fetch('/api/governance/amendments',{cache:'no-store'});
    const data=await response.json().catch(()=>({})) as {amendments?:Amendment[]};
    if(response.ok) setAmendments(Array.isArray(data.amendments)?data.amendments:[]);
  }
  useEffect(()=>{
    let cancelled=false;
    queueMicrotask(()=>{if(!cancelled) void load()});
    fetch('/api/governance/document-content?reference='+encodeURIComponent(document.referenceCode),{cache:'no-store'})
      .then(async response=>response.ok?response.json():null)
      .then(data=>{if(!cancelled)setEmbeddedSections(Array.isArray(data?.sections)?data.sections:[])})
      .catch(()=>{if(!cancelled)setEmbeddedSections([])})
      .finally(()=>{if(!cancelled)setContentLoading(false)});
    return()=>{cancelled=true};
  },[document.referenceCode]);
  const related=useMemo(()=>amendments.filter(item=>item.documentRef===document.referenceCode),[amendments,document.referenceCode]);

  async function submit(event:FormEvent){
    event.preventDefault(); if(pending)return; setPending(true); setFeedback('');
    try{
      const response=await fetch('/api/governance/amendments',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({operation:'CREATE',documentRef:document.referenceCode,documentTitle:document.title,roomKey,
          clauseRef:clauseRef.trim()||null,currentRule:currentRule.trim()||null,proposedRule:proposedRule.trim(),rationale:rationale.trim(),priority}),
      });
      const data=await response.json().catch(()=>({})) as {error?:string};
      if(!response.ok) throw new Error(data.error||'تعذر إنشاء الطلب');
      setFeedback('تم فتح طلب التعديل لدى المحافظ للمناقشة الأولية.');
      setFormOpen(false); setClauseRef(''); setCurrentRule(''); setProposedRule(''); setRationale(''); await load();
    }catch{ setFeedback('تعذر فتح طلب التعديل الآن.'); } finally{ setPending(false); }
  }

  return <div className={`${styles.mobileOverlay} ${styles.fullPageOverlay}`} role="dialog" aria-modal="true" aria-label={'تفاصيل '+document.title}>
    <aside className={`${styles.mobileSheet} ${styles.governedDocumentSheet} ${styles.fullPageSheet}`}>
      <div className={`${styles.sheetHeader} ${styles.fullPageHeader}`}><strong>تفاصيل المرجع الحاكم</strong><button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>
      <div className={styles.governedDocumentContent}>
        <section className={styles.governedDocumentHero}>
          <div><strong>{document.title}</strong><small>{kindLabel[document.kind]??'مرجع'} · الإصدار {displayVersion(document.version)}</small></div>
          <LucideIcon name={document.kind==='record'?'listChecks':'landmark'} size={24}/>
        </section>

        <details className={styles.governedDocumentSection} open>
          <summary><span>المرجع والنفاذ</span><LucideIcon name="chevronDown" size={16}/></summary>
          <div><p>النوع: <b>{kindLabel[document.kind]??'مرجع'}</b></p><p>الحالة: <b>مرجع نافذ ما لم يوجد قرار تعديل معتمد بتاريخ نفاذ لاحق.</b></p>
          {document.sourceUrl&&<a href={document.sourceUrl} target="_blank" rel="noreferrer">فتح النسخة المؤرشفة</a>}</div>
        </details>

        <details className={styles.governedDocumentSection}>
          <summary><span>الأبواب والبنود</span><LucideIcon name="chevronDown" size={16}/></summary>
          <div className={styles.governedInternalContent}>{embeddedSections.length
            ?embeddedSections.map((section,index)=><article key={index}><b>الباب {arabicDigits(String(index+1))} — {arabicVisibleText(section.title)}</b>{section.lines.map((line,lineIndex)=><p key={lineIndex}><span>البند {arabicDigits(String(index+1)+'.'+String(lineIndex+1))}</span>{arabicVisibleText(line)}</p>)}</article>)
            :<p>{contentLoading?'جارٍ تحميل النص المعتمد…':'لم يكتمل استيراد النص الداخلي لهذا المرجع بعد. تبقى النسخة المؤرشفة متاحة عند الحاجة.'}</p>}</div>
        </details>

        <details className={styles.governedDocumentSection} open>
          <summary><span>طلبات التعديل والمناقشة</span><LucideIcon name="chevronDown" size={16}/></summary>
          <div className={styles.governedAmendmentList}>
            {!related.length&&<p>لا توجد طلبات تعديل مرتبطة بهذا المرجع حتى الآن.</p>}
            {related.map(item=><article key={item.requestId} className={styles.governedAmendmentCard}>
              <header><strong>طلب تعديل</strong><span>{statusLabel[item.status]??'قيد المراجعة'}</span></header>
              <small>{priorityLabel[item.priority]}</small>
              {item.clauseRef&&<p><b>البند:</b> {arabicDigits(item.clauseRef)}</p>}<p><b>المقترح:</b> {item.proposedRule}</p><p><b>السبب:</b> {item.rationale}</p>
              {item.discussionNotes.length>0&&<div>{item.discussionNotes.map((note,index)=><p key={index}>• {note}</p>)}</div>}
              {item.effectiveAt&&<p><b>تاريخ النفاذ:</b> {item.effectiveAt}</p>}
            </article>)}
          </div>
        </details>

        {!formOpen?<button type="button" className={styles.primaryActionButton} onClick={()=>setFormOpen(true)}><LucideIcon name="pencil" size={20}/><span>طلب تعديل هذا المرجع</span></button>
        :<form className={styles.governedAmendmentForm} onSubmit={submit}>
          <strong>طلب تعديل — يبدأ بمراجعة المحافظ</strong>
          <label><span>رقم الباب أو البند</span><input value={clauseRef} onChange={e=>setClauseRef(e.target.value)} placeholder="مثال: الباب ٢، البند ١"/></label>
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
