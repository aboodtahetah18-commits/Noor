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
const kindLabel:Record<string,string>={record:'سجل',charter:'ميثاق',policy:'سياسة',reference:'مرجع',contract:'عقد'};

type DocumentBlock =
  | {kind:'paragraph';text:string}
  | {kind:'table';headers:string[];rows:string[][]};
type DocumentSection={title:string;blocks:DocumentBlock[]};

function markdownCells(line:string){
  return line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(cell=>cell.trim());
}
function isMarkdownDivider(line:string){
  const cells=markdownCells(line);
  return cells.length>1&&cells.every(cell=>/^:?-{3,}:?$/.test(cell));
}
function cleanDocumentText(line:string){
  return line.trim().replace(/^#{1,6}\s*/,'').replace(/^\*\*(.+)\*\*$/,'$1').trim();
}
function parseGovernedDocument(content:string):DocumentSection[]{
  const lines=content.replace(/\r/g,'').split('\n');
  const sections:DocumentSection[]=[];
  let current:DocumentSection={title:'المحتوى المعتمد',blocks:[]};
  let paragraph:string[]=[];
  const flushParagraph=()=>{
    if(!paragraph.length)return;
    current.blocks.push({kind:'paragraph',text:paragraph.join(' ').trim()});
    paragraph=[];
  };
  const flushSection=()=>{
    flushParagraph();
    if(current.blocks.length||sections.length===0&&current.title!=='المحتوى المعتمد')sections.push(current);
  };

  for(let index=0;index<lines.length;index++){
    const raw=lines[index]??'';
    const trimmed=raw.trim();
    if(!trimmed){flushParagraph();continue;}

    const headingMatch=trimmed.match(/^#{1,6}\s+(.+)$/);
    const majorLine=!trimmed.startsWith('|')&&(
      /^\d+\s*[.)-]\s+/.test(trimmed)||
      /^\d+\s*\|\s*[^|]+/.test(trimmed)||
      /^(?:الباب|الفصل|المادة)\s+/.test(trimmed)
    );
    if(headingMatch||majorLine){
      flushParagraph();
      if(current.blocks.length)sections.push(current);
      current={title:cleanDocumentText(headingMatch?.[1]??trimmed),blocks:[]};
      continue;
    }

    const next=lines[index+1]?.trim()??'';
    if(trimmed.includes('|')&&next.includes('|')&&isMarkdownDivider(next)){
      flushParagraph();
      const headers=markdownCells(trimmed);
      const rows:string[][]=[];
      index+=1;
      while(index+1<lines.length){
        const candidate=lines[index+1]?.trim()??'';
        if(!candidate||!candidate.includes('|'))break;
        rows.push(markdownCells(candidate));
        index+=1;
      }
      current.blocks.push({kind:'table',headers,rows});
      continue;
    }

    paragraph.push(cleanDocumentText(trimmed));
  }
  flushSection();
  return sections.filter(section=>section.blocks.length||section.title!=='المحتوى المعتمد');
}

export function GovernedDocumentMobileSheet({document,roomKey,onClose}:{document:GovernedDocumentRef;roomKey:string;onClose:()=>void}){
  const [amendments,setAmendments]=useState<Amendment[]>([]);
  const [documentContent,setDocumentContent]=useState('');
  const [documentLoading,setDocumentLoading]=useState(true);
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
    queueMicrotask(async()=>{
      if(cancelled)return;
      void load();
      try{
        const response=await fetch('/api/governance/documents/'+encodeURIComponent(document.referenceCode),{cache:'no-store'});
        const data=await response.json().catch(()=>({})) as {document?:{content?:string}};
        if(!cancelled&&response.ok)setDocumentContent(String(data.document?.content??''));
      }finally{
        if(!cancelled)setDocumentLoading(false);
      }
    });
    return()=>{cancelled=true};
  },[document.referenceCode]);
  const related=useMemo(()=>amendments.filter(item=>item.documentRef===document.referenceCode),[amendments,document.referenceCode]);
  const documentSections=useMemo(()=>parseGovernedDocument(documentContent),[documentContent]);

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
      setFeedback('تم فتح طلب التعديل لدى المحافظ للمناقشة الأولية.');
      setFormOpen(false); setClauseRef(''); setCurrentRule(''); setProposedRule(''); setRationale(''); await load();
    }catch{ setFeedback('تعذر فتح طلب التعديل الآن.'); } finally{ setPending(false); }
  }

  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label={'تفاصيل '+document.title}>
    <aside className={styles.mobileSheet+' '+styles.governedDocumentSheet+' '+styles.mobileFullPageSheet}>
      <div className={styles.sheetHeader}><strong>تفاصيل المرجع الحاكم</strong><button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>
      <div className={styles.governedDocumentContent}>
        <section className={styles.governedDocumentHero}>
          <div><strong>{document.title}</strong><small>{document.version?'الإصدار '+document.version.replace(/^v/i,''):'الإصدار النافذ المعتمد'}</small></div>
          <LucideIcon name={document.kind==='record'?'listChecks':'landmark'} size={24}/>
        </section>

        <details className={styles.governedDocumentSection} open>
          <summary><span>المرجع والنفاذ</span><LucideIcon name="chevronDown" size={16}/></summary>
          <div><p>النوع: <b>{kindLabel[document.kind]??'مرجع حاكم'}</b></p><p>الحالة: <b>نافذ ما لم يوجد قرار تعديل معتمد بتاريخ نفاذ لاحق.</b></p><p>المصدر المعتمد محفوظ داخل نماء، وتبقى النسخة الخارجية للأرشفة فقط.</p></div>
        </details>

        <details className={styles.governedDocumentSection} open>
          <summary><span>المحتوى الكامل</span><LucideIcon name="chevronDown" size={16}/></summary>
          <div className={styles.governedLocalDocument}>
            {documentLoading
              ?<p>جارٍ تحميل المرجع المعتمد داخل نماء…</p>
              :documentContent
                ?<div className={styles.governedStructuredDocument}>
                  {documentSections.map((section,sectionIndex)=><details className={styles.governedContentSection} key={sectionIndex} open={sectionIndex===0}>
                    <summary><strong>{section.title}</strong><LucideIcon name="chevronDown" size={16}/></summary>
                    <div className={styles.governedContentSectionBody}>
                      {section.blocks.map((block,blockIndex)=>block.kind==='paragraph'
                        ?<p key={blockIndex}>{block.text}</p>
                        :<div className={styles.governedTableScroll} key={blockIndex}>
                          <table className={styles.governedContentTable}>
                            <thead><tr>{block.headers.map((header,headerIndex)=><th key={headerIndex} scope="col">{header}</th>)}</tr></thead>
                            <tbody>{block.rows.map((row,rowIndex)=><tr key={rowIndex}>{block.headers.map((_,cellIndex)=><td key={cellIndex}>{row[cellIndex]??''}</td>)}</tr>)}</tbody>
                          </table>
                        </div>)}
                    </div>
                  </details>)}
                </div>
                :<p>تعذر تحميل النسخة المحلية الآن. المرجع محفوظ في نماء ويمكن إعادة المحاولة دون الرجوع إلى مصدر خارجي.</p>}
          </div>
        </details>

        <details className={styles.governedDocumentSection} open>
          <summary><span>طلبات التعديل والمناقشة</span><LucideIcon name="chevronDown" size={16}/></summary>
          <div className={styles.governedAmendmentList}>
            {!related.length&&<p>لا توجد طلبات تعديل مرتبطة بهذا المرجع حتى الآن.</p>}
            {related.map(item=><article key={item.requestId} className={styles.governedAmendmentCard}>
              <header><strong>طلب تعديل</strong><span>{statusLabel[item.status]??'قيد المعالجة'}</span></header>
              <small>{priorityLabel[item.priority]}</small>
              {item.clauseRef&&<p><b>البند:</b> {item.clauseRef}</p>}<p><b>المقترح:</b> {item.proposedRule}</p><p><b>السبب:</b> {item.rationale}</p>
              {item.discussionNotes.length>0&&<div>{item.discussionNotes.map((note,index)=><p key={index}>• {note}</p>)}</div>}
              {item.councilDecisionId&&<p><b>قرار المجلس:</b> تم تسجيل القرار واعتماده في السجل الحوكمي.</p>}{item.nextVersion&&<p><b>الإصدار الجديد:</b> {item.nextVersion}</p>}{item.effectiveAt&&<p><b>تاريخ النفاذ:</b> {item.effectiveAt}</p>}
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
