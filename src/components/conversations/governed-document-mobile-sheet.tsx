'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';
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
const priorityLabel={NORMAL:'عادي',NEXT_MEETING:'للاجتماع القادم',URGENT:'عاجل، اجتماع فوري'} as const;

type DocumentBlock =
  | {kind:'paragraph';text:string}
  | {kind:'clause';number:string;title:string;text:string}
  | {kind:'table';headers:string[];rows:string[][]};
type DocumentSection={title:string;blocks:DocumentBlock[]};

const westernDigits=(value:string)=>value
  .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const visibleTermReplacements:Array<[RegExp,string]>=[
  [/AUDIT[\s_-]*CLOSURE/gi,'إغلاق التدقيق'],
  [/REVALIDATION[\s_-]*REQUIRED/gi,'يلزم إعادة التحقق'],
  [/HARD[\s_-]*GUARD/gi,'قاعدة صارمة'],
  [/CASH[\s_-]*FLOOR/gi,'الحد الأدنى للسيولة'],
  [/AUTHORITY[\s_-]*MATRIX/gi,'مصفوفة الصلاحيات'],
  [/WAITING[\s_-]*DATA/gi,'بانتظار البيانات'],
  [/SUCCESS/gi,'مكتمل'],
  [/PARTIAL/gi,'مكتمل جزئيًا'],
  [/APPROVED/gi,'معتمد'],
  [/REJECTED/gi,'مرفوض'],
  [/INPUTS?/gi,'المدخلات'],
  [/OUTPUTS?/gi,'المخرجات'],
  [/TRIGGER/gi,'المحفز'],
  [/ACTION/gi,'الإجراء'],
  [/ACCEPTANCE/gi,'القبول'],
];
function cleanVisibleArabic(value:string){
  let text=value;
  for(const [pattern,replacement] of visibleTermReplacements) text=text.replace(pattern,replacement);
  text=text
    .replace(/\bS(\d+)\b/gi,(_,n)=>'رقم '+westernDigits(String(n)))
    .replace(/\bR(\d+)\s*[-–—]\s*R?(\d+)\b/gi,(_,a,b)=>'المستويات '+westernDigits(String(a))+' إلى '+westernDigits(String(b)))
    .replace(/^#{1,6}\s*/,'')
    .replace(/^(\d+)\s*[.)-]\s*/,'$1 ')
    .replace(/^[-*•]+\s*/,'')
    .replace(/\*\*|__|\*|_|\`/g,'')
    .replace(/[A-Za-z][A-Za-z0-9_./:-]*/g,'')
    .replace(/\s+[—–-]\s+/g,'، ')
    .replace(/\s{2,}/g,' ')
    .replace(/\s+([،؛:.])/g,'$1')
    .trim();
  return westernDigits(text);
}

function parseClauseLine(value:string){
  const normalized=westernDigits(value)
    .replace(/^#{1,6}\s*/,'')
    .replace(/\*\*|__|\*|_|\`/g,'')
    .trim();
  const match=normalized.match(/^(\d+(?:\.\d+)+)\s+([^:–—\\-]+?)(?:\s*[–—-]\s*|\s*:\s*)(.+)$/);
  if(!match)return null;
  const number=match[1];
  const title=cleanVisibleArabic(match[2]??'');
  const text=cleanVisibleArabic(match[3]??'');
  if(!number||!title)return null;
  return {kind:'clause' as const,number,title,text};
}
function documentLineParts(line:string){
  const expanded=line
    .replace(/\*\*([^*]+?)\s*:\*\*/g,'\n$1: ')
    .replace(/\*\*([^*]+?)\*\*\s*:/g,'\n$1: ');
  return expanded.split(/\n+/).map(cleanVisibleArabic).filter(Boolean);
}
function markdownCells(line:string){
  return line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(cell=>cleanVisibleArabic(cell));
}
function isMarkdownDivider(line:string){
  const cells=line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(cell=>cell.trim());
  return cells.length>1&&cells.every(cell=>/^:?-{3,}:?$/.test(cell));
}
function cleanDocumentText(line:string){
  return cleanVisibleArabic(line);
}

type GovernedDisplayType='policy'|'procedure'|'matrix'|'mechanism'|'reference';

function resolveGovernedDisplayType(document:GovernedDocumentRef,content:string):GovernedDisplayType{
  const haystack=(document.title+' '+content.slice(0,2400)).toLowerCase();
  if(/مصفوفة/.test(haystack)) return 'matrix';
  if(/(?:^|\s)آلية|آليه|mechanism/.test(haystack)) return 'mechanism';
  if(/إجراء|اجراء|procedure/.test(haystack)) return 'procedure';
  if(document.kind==='policy'||/سياسة|policy/.test(haystack)) return 'policy';
  return 'reference';
}
function governedDisplayLabel(type:GovernedDisplayType){
  return ({policy:'سياسة',procedure:'إجراء',matrix:'مصفوفة',mechanism:'آلية',reference:'مرجع حاكم'} as const)[type];
}
function governedDisplayDescription(type:GovernedDisplayType){
  return ({
    policy:'تحدد القواعد والضوابط الحاكمة وما يجب الالتزام به عند اتخاذ القرار.',
    procedure:'يوضح تسلسل العمل والمسؤوليات ونقاط التحقق من البداية حتى الإغلاق.',
    matrix:'توضح الصلاحيات والمسؤوليات وحدود الاعتماد بين الأدوار والجهات.',
    mechanism:'توضح كيف تعمل الآلية، ومتى تبدأ، ومن يعتمدها، وما مخرجاتها.',
    reference:'مرجع حاكم معتمد يوضح القواعد المنظمة لهذا النطاق داخل نماء.',
  } as const)[type];
}
function sectionIcon(title:string,type:GovernedDisplayType):LucideIconName{
  if(/مصفوفة|صلاحيات|مسؤوليات/.test(title)) return 'layoutGrid';
  if(/خطوات|مسار|اعتماد/.test(title)) return 'listChecks';
  if(/ضوابط|أحكام/.test(title)) return 'settings';
  if(/هدف|غرض/.test(title)) return 'target';
  if(/نطاق/.test(title)) return 'repeat2';
  if(/مرجع|روابط/.test(title)) return 'receiptText';
  if(type==='procedure') return 'listChecks';
  if(type==='mechanism') return 'repeat2';
  return 'receiptText';
}

function normalizeHeadingText(value:string){
  return cleanVisibleArabic(value)
    .replace(/^\d+(?:\.\d+)*\s*[.)-]?\s*/,'')
    .replace(/^[أ-ي]\s*[.)-]\s*/u,'')
    .trim();
}

function parseGovernedDocument(content:string):DocumentSection[]{
  const lines=content.replace(/\r/g,'').split('\n');
  const sections:DocumentSection[]=[];
  let current:DocumentSection={title:'المحتوى المعتمد',blocks:[]};
  let sectionCounter=0;
  let clauseCounter=0;

  const flush=()=>{
    if(current.blocks.length) sections.push(current);
  };
  const beginSection=(title:string)=>{
    flush();
    sectionCounter+=1;
    clauseCounter=0;
    current={title:String(sectionCounter)+' '+(normalizeHeadingText(title)||'قسم'),blocks:[]};
  };
  const pushClause=(text:string,title?:string)=>{
    clauseCounter+=1;
    const cleaned=cleanDocumentText(text);
    const cleanedTitle=title?cleanDocumentText(title):'البند';
    if(cleaned||cleanedTitle) current.blocks.push({kind:'clause',number:String(sectionCounter||1)+'.'+String(clauseCounter),title:cleanedTitle||'البند',text:cleaned});
  };
  const pushParagraph=(text:string)=>{
    const cleaned=cleanDocumentText(text);
    if(cleaned) current.blocks.push({kind:'paragraph',text:cleaned});
  };

  for(let index=0;index<lines.length;index++){
    const raw=lines[index]??'';
    const trimmed=raw.trim();
    if(!trimmed) continue;
    const normalized=westernDigits(trimmed);

    const markdownHeading=normalized.match(/^(#{1,6})\s+(.+)$/);
    if(markdownHeading){
      const level=(markdownHeading[1]??'').length;
      const heading=markdownHeading[2]??'';
      if(level<=2){
        beginSection(heading);
      }else{
        pushClause('',normalizeHeadingText(heading));
      }
      continue;
    }

    const explicitSection=normalized.match(/^(?:الباب|الفصل|المادة)\s+(.+)$/);
    if(explicitSection){
      beginSection(explicitSection[1]??normalized);
      continue;
    }

    const next=westernDigits(lines[index+1]?.trim()??'');
    if(normalized.includes('|')&&next.includes('|')&&isMarkdownDivider(next)){
      const headers=markdownCells(normalized);
      const rows:string[][]=[];
      index+=1;
      while(index+1<lines.length){
        const candidate=westernDigits(lines[index+1]?.trim()??'');
        if(!candidate||!candidate.includes('|'))break;
        rows.push(markdownCells(candidate));
        index+=1;
      }
      current.blocks.push({kind:'table',headers,rows});
      continue;
    }

    const explicitClause=normalized.match(/^(\d+(?:\.\d+)+|\d+|[أابجدهـويزحطكلمنسعفصقرشتثخذضظغ])\s*[.)-]?\s+(.+)$/u);
    if(explicitClause){
      const body=explicitClause[2]??'';
      const withSeparator=body.match(/^([^:–—-]+?)\s*(?::|[–—-])\s*(.+)$/);
      if(withSeparator) pushClause(withSeparator[2]??'',withSeparator[1]??'البند');
      else pushClause(body,'البند');
      continue;
    }

    const clause=parseClauseLine(normalized);
    if(clause){
      pushClause(clause.text,clause.title);
      continue;
    }

    if(/\*\*[^*]+:\*\*/.test(normalized)||/\*\*[^*]+\*\*\s*:/.test(normalized)){
      for(const part of documentLineParts(normalized)) pushParagraph(part);
      continue;
    }

    pushParagraph(normalized);
  }

  flush();
  if(!sections.length&&current.blocks.length) sections.push(current);
  return sections.filter(section=>section.blocks.length&&Boolean(section.title));
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
  const displayType=useMemo(()=>resolveGovernedDisplayType(document,documentContent),[document,documentContent]);
  const displayLabel=governedDisplayLabel(displayType);
  const isFlowDocument=displayType==='procedure'||displayType==='mechanism';
  const isMatrixDocument=displayType==='matrix';
  const displayDescription=governedDisplayDescription(displayType);

  function downloadLocalCopy(){
    if(!documentContent)return;
    const blob=new Blob([documentContent],{type:'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.download=(document.title||'مرجع نماء')+'.md';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }


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
          <div className={styles.governedHeroCopy}>
            <span className={styles.governedHeroEyebrow}><LucideIcon name="receiptText" size={16}/>{displayLabel}</span>
            <strong>{document.title}</strong>
            <p>{displayDescription}</p>
          </div>
          <span className={styles.governedHeroIcon} aria-hidden="true"><LucideIcon name={document.kind==='record'?'listChecks':'landmark'} size={32}/></span>
          <section className={styles.governedMetaStrip} aria-label="ملخص الوثيقة">
            <div><small>الحالة</small><strong className={styles.governedStatusActive}>سارية</strong></div>
            <div><small>الإصدار</small><strong>{document.version?document.version.replace(/^v/i,''):'المعتمد'}</strong></div>
            <div><small>المصدر</small><strong>نماء</strong></div>
          </section>
        </section>

        {displayType==='mechanism'&&<section className={styles.governedFlowCard}>
          <header><LucideIcon name="repeat2" size={20}/><div><strong>مسار الاعتماد</strong><small>المسار الحاكم حتى الاعتماد والنفاذ.</small></div></header>
          <ol className={styles.governedFlowSteps}>
            {['المحافظ','أمين السر','مجلس نماء الأعلى','اعتماد أو رفض','تاريخ النفاذ والإصدار'].map((label,index)=><li key={label}><span>{index+1}</span><strong>{label}</strong></li>)}
          </ol>
          <p>لا تستخدم النسخة المعدلة قبل اكتمال الاعتماد وبدء تاريخ النفاذ.</p>
        </section>}

        <details className={styles.governedDocumentSection} open>
          <summary><span><LucideIcon name="receiptText" size={16}/><strong>المحتوى المعتمد</strong></span><LucideIcon name="chevronDown" size={16}/></summary>
          <div className={styles.governedLocalDocument}>
            {documentLoading
              ?<p>جارٍ تحميل المرجع المعتمد داخل نماء…</p>
              :documentContent
                ?<div className={styles.governedStructuredDocument}>
                  {documentSections.map((section,sectionIndex)=><details className={styles.governedContentSection+' '+(isMatrixDocument?styles.governedMatrixSection:'')+' '+(isFlowDocument?styles.governedFlowSection:'')} key={sectionIndex} open={sectionIndex===0||isMatrixDocument}>
                    <summary><span><LucideIcon name={sectionIcon(section.title,displayType)} size={16}/><strong>{section.title}</strong></span><LucideIcon name="chevronDown" size={16}/></summary>
                    <div className={styles.governedContentSectionBody}>
                      {section.blocks.map((block,blockIndex)=>block.kind==='paragraph'
                        ?<p key={blockIndex}>{block.text}</p>
                        :block.kind==='clause'
                          ?<article className={styles.governedClauseRow} key={blockIndex}>
                            <div className={styles.governedClauseHeading}><span>{block.number}</span><strong>{block.title}</strong></div>
                            {block.text&&<p>{block.text}</p>}
                          </article>
                          :<div className={styles.governedTableCards} key={blockIndex}>
                          {block.rows.map((row,rowIndex)=><article className={styles.governedTableCard} key={rowIndex}>
                            {block.headers.map((header,cellIndex)=><div key={cellIndex}>
                              <small>{header||'البيان'}</small>
                              <strong>{row[cellIndex]||'غير محدد'}</strong>
                            </div>)}
                          </article>)}
                        </div>)}
                    </div>
                  </details>)}
                </div>
                :<p>تعذر تحميل النسخة المحلية الآن. المرجع محفوظ في نماء ويمكن إعادة المحاولة دون الرجوع إلى مصدر خارجي.</p>}
          </div>
        </details>

        <details className={styles.governedDocumentSection} open>
          <summary><span><LucideIcon name="messageSquareText" size={16}/><strong>طلبات التعديل والمناقشة</strong></span><LucideIcon name="chevronDown" size={16}/></summary>
          <div className={styles.governedAmendmentList}>
            {!related.length&&<p>لا توجد طلبات تعديل مرتبطة بهذا المرجع حتى الآن.</p>}
            {related.map(item=><article key={item.requestId} className={styles.governedAmendmentCard}>
              <header><strong>طلب تعديل</strong><span>{statusLabel[item.status]??'قيد المعالجة'}</span></header>
              <small>{priorityLabel[item.priority]}</small>
              {item.clauseRef&&<p><b>البند:</b> {item.clauseRef}</p>}<p><b>المقترح:</b> {item.proposedRule}</p><p><b>السبب:</b> {item.rationale}</p>
              {item.discussionNotes.length>0&&<div>{item.discussionNotes.map((note,index)=><p key={index}>{note}</p>)}</div>}
              {item.councilDecisionId&&<p><b>قرار المجلس:</b> تم تسجيل القرار واعتماده في السجل الحوكمي.</p>}{item.nextVersion&&<p><b>الإصدار الجديد:</b> {item.nextVersion}</p>}{item.effectiveAt&&<p><b>تاريخ النفاذ:</b> {item.effectiveAt}</p>}
            </article>)}
          </div>
        </details>

        {!formOpen?<div className={styles.governedActionRail}><button type="button" className={styles.governedDownloadButton} onClick={downloadLocalCopy} disabled={!documentContent}><LucideIcon name="receiptText" size={20}/><span>تحميل النسخة</span></button><button type="button" className={styles.primaryActionButton} onClick={()=>setFormOpen(true)}><LucideIcon name="pencil" size={20}/><span>طلب تعديل هذا المرجع</span></button></div>
        :<form className={styles.governedAmendmentForm} onSubmit={submit}>
          <strong>طلب تعديل، يبدأ بمراجعة المحافظ</strong>
          <label><span>رقم البند أو المادة</span><input value={clauseRef} onChange={e=>setClauseRef(e.target.value)} placeholder="مثال: المادة 4.2"/></label>
          <label><span>النص أو الوضع الحالي</span><textarea value={currentRule} onChange={e=>setCurrentRule(e.target.value)} placeholder="اختياري — اكتب النص الحالي الذي تريد مراجعته"/></label>
          <label><span>التعديل المقترح</span><textarea required value={proposedRule} onChange={e=>setProposedRule(e.target.value)} placeholder="اكتب التعديل المقترح بدقة"/></label>
          <label><span>مبرر التعديل</span><textarea required value={rationale} onChange={e=>setRationale(e.target.value)} placeholder="لماذا نحتاج هذا التعديل؟ وما أثره المتوقع؟"/></label>
          <label><span>الأولوية</span><select value={priority} onChange={e=>setPriority(e.target.value as typeof priority)}><option value="NORMAL">عادي</option><option value="NEXT_MEETING">للاجتماع القادم</option><option value="URGENT">عاجل، اجتماع فوري</option></select></label>
          <p>المسار: المحافظ، ثم أمين السر، ثم مجلس نماء الأعلى، ثم الاعتماد أو الرفض، ثم تاريخ النفاذ والإصدار الجديد.</p>
          <div className={styles.governedAmendmentActions}><button type="button" onClick={()=>setFormOpen(false)}>إلغاء</button><button type="submit" disabled={pending}>{pending?'جارٍ الإرسال…':'إرسال للمحافظ'}</button></div>
        </form>}
        {feedback&&<p className={styles.governedDocumentFeedback}>{feedback}</p>}
      </div>
    </aside>
  </div>;
}
