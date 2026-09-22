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
  | {kind:'flow';steps:string[]}
  | {kind:'table';headers:string[];rows:string[][]};
type DocumentSection={title:string;blocks:DocumentBlock[]};

const westernDigits=(value:string)=>value
  .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const technicalTermReplacements:Array<[RegExp,string]>=[
  [/\baudit_event_id\b/gi,'معرف حدث التدقيق'],
  [/\bevent_type\b/gi,'نوع الحدث'],
  [/\btimestamp\b/gi,'وقت الحدث'],
  [/\buser_id\b/gi,'معرف المستخدم الداخلي'],
  [/\bactor_type\b/gi,'نوع الجهة المنفذة'],
  [/\bactor_id\b/gi,'معرف الجهة المنفذة'],
  [/\bdecision_id\b/gi,'معرف القرار'],
  [/\bcase_id\b/gi,'معرف القضية'],
  [/\bcycle_id\b/gi,'معرف الدورة'],
  [/\bsource_entity\b/gi,'الجهة المصدر'],
  [/\binput_snapshot_ref\b/gi,'مرجع لقطة المدخلات'],
  [/\bdata_confidence\b/gi,'درجة الثقة في البيانات'],
  [/\bpolicy_version\b/gi,'إصدار السياسة'],
  [/\bweights_version\b/gi,'إصدار الأوزان'],
  [/\balgorithm_version\b/gi,'إصدار الخوارزمية'],
  [/\brisk_state\b/gi,'حالة المخاطر'],
  [/\brisk_level\b/gi,'مستوى المخاطر'],
  [/\baction_before\b/gi,'الإجراء قبل الحدث'],
  [/\baction_after\b/gi,'الإجراء بعد الحدث'],
  [/\breason_codes\b/gi,'رموز الأسباب'],
  [/\bhard_rule_results\b/gi,'نتائج القواعد الصارمة'],
  [/\bsimulation_ref\b/gi,'مرجع المحاكاة'],
  [/\bapproval_state\b/gi,'حالة الاعتماد'],
  [/\bexecution_state\b/gi,'حالة التنفيذ'],
  [/\bevidence_ref\b/gi,'مرجع الإثبات'],
  [/\bparent_event_id\b/gi,'معرف الحدث الأصلي'],
  [/\bintegrity_hash\b/gi,'بصمة سلامة السجل'],
  [/\bUSER\b/g,'المستخدم'],
  [/\bCENTRAL_ENGINE\b/g,'المحرك المركزي'],
  [/\bBANK\b/g,'البنك'],
  [/\bADVISOR\b/g,'المستشار'],
  [/\bCOMMITTEE\b/g,'اللجنة'],
  [/\bSYSTEM\b/g,'النظام'],
];
const technicalFlowLabels:Record<string,string>={
  'EVENT / USER REQUEST':'حدث مالي أو طلب من المستخدم',
  'CLASSIFY DECISION':'تصنيف القرار',
  'COLLECT REQUIRED DATA':'جمع البيانات المطلوبة',
  'CHECK DATA COMPLETENESS + CONFIDENCE':'فحص اكتمال البيانات ودرجة الثقة',
  'HARD-GATE CHECK':'فحص القواعد والبوابات الصارمة',
  'RECALCULATE SCORE + RISK':'إعادة حساب الدرجة والمخاطر',
  'GENERATE LEGAL OPTIONS':'إنشاء البدائل المسموحة',
  'SIMULATE EACH OPTION':'محاكاة كل بديل',
  'RANK OPTIONS':'ترتيب البدائل',
  'EXPLAIN RECOMMENDATION + ALTERNATIVES':'شرح التوصية والبدائل',
  'USER DECISION / CONFIRMATION':'قرار المستخدم أو تأكيده',
  'FOLLOW-UP TASKS':'إنشاء مهام المتابعة',
  'EXECUTION CONFIRMATION':'تأكيد التنفيذ',
  'POST-EXECUTION REVIEW':'مراجعة ما بعد التنفيذ',
  'LEARN PREFERENCES + UPDATE STATE':'تحديث التفضيلات والحالة دون تغيير القواعد الصارمة',
};
function translateTechnicalFlow(value:string){
  const normalized=value.trim().replace(/^[-*•]+\s*/,'');
  if(!normalized||/^[↓↑+\/|\-–—]+$/.test(normalized)) return '';
  if(technicalFlowLabels[normalized]) return technicalFlowLabels[normalized];
  let text=normalized;
  for(const [pattern,replacement] of technicalTermReplacements) text=text.replace(pattern,replacement);
  return text;
}
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
  for(const [pattern,replacement] of technicalTermReplacements) text=text.replace(pattern,replacement);
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
    .replace(/^\s*[أ-ي]\s*[.)-]\s*/u,'')
    .replace(/^\s*\d+(?:\.\d+)*\s*[.)|-]?\s*/,'')
    .trim();
}
function extractDocumentMetadata(content:string){
  const normalized=westernDigits(content).replace(/\*\*/g,'');
  const version=normalized.match(/الإصدار\s*[:：]\s*([^\n\r]+)/)?.[1]?.trim()||'';
  const status=normalized.match(/الحالة\s*[:：]\s*([^\n\r]+)/)?.[1]?.trim()||'';
  const scope=normalized.match(/النطاق\s*[:：]\s*([^\n\r]+)/)?.[1]?.trim()||'';
  return {version,status,scope};
}

function parseGovernedDocument(content:string):DocumentSection[]{
  const lines=content.replace(/\r/g,'').split('\n');
  const sections:DocumentSection[]=[];
  let current:DocumentSection={title:'المحتوى المعتمد',blocks:[]};
  let sectionCounter=0;
  let clauseCounter=0;
  let skipMetadataValue=false;

  const flush=()=>{ if(current.blocks.length) sections.push(current); };
  const beginSection=(title:string)=>{
    flush();
    sectionCounter+=1;
    clauseCounter=0;
    current={title:String(sectionCounter)+' '+(normalizeHeadingText(title)||'قسم'),blocks:[]};
  };
  const pushClause=(text:string,title='')=>{
    clauseCounter+=1;
    const cleaned=cleanDocumentText(text);
    const cleanedTitle=title?cleanDocumentText(title):'';
    if(cleaned||cleanedTitle) current.blocks.push({kind:'clause',number:String(sectionCounter||1)+'.'+String(clauseCounter),title:cleanedTitle,text:cleaned});
  };
  const pushParagraph=(text:string)=>{
    const cleaned=cleanDocumentText(text);
    if(cleaned) current.blocks.push({kind:'paragraph',text:cleaned});
  };
  const pushFlow=(steps:string[])=>{
    const cleaned=steps.map(translateTechnicalFlow).map(cleanDocumentText).filter(Boolean);
    if(cleaned.length) current.blocks.push({kind:'flow',steps:cleaned});
  };

  for(let index=0;index<lines.length;index++){
    const raw=lines[index]??'';
    const trimmed=raw.trim();
    if(!trimmed) continue;
    const normalized=westernDigits(trimmed);

    if(skipMetadataValue){ skipMetadataValue=false; continue; }
    if(normalized.startsWith(String.fromCharCode(96,96,96))){
      const codeLines:string[]=[];
      index+=1;
      while(index<lines.length&&!String(lines[index]??'').trim().startsWith(String.fromCharCode(96,96,96))){
        codeLines.push(lines[index]??'');
        index+=1;
      }
      pushFlow(codeLines.flatMap(line=>line.includes('→')?line.split('→'):[line]));
      continue;
    }

    const inlineMeta=normalized.replace(/\*\*/g,'').match(/^(الإصدار|الحالة|النطاق)\s*[:：]/);
    if(inlineMeta) continue;

    const markdownHeading=normalized.match(/^(#{1,6})\s+(.+)$/);
    if(markdownHeading){
      const level=(markdownHeading[1]??'').length;
      const headingRaw=markdownHeading[2]??'';
      const heading=normalizeHeadingText(headingRaw);
      if(/^(الإصدار|الحالة|النطاق)$/.test(heading)){ skipMetadataValue=true; continue; }
      if(level===1&&sections.length===0&&current.blocks.length===0&&/(بنك|نماء|سياسة|مصفوفة|دستور|الرقابة|محرك|مرجع)/.test(heading)) continue;
      if(level<=2) beginSection(headingRaw);
      else pushClause('',heading);
      continue;
    }

    const explicitSection=normalized.match(/^(?:الباب|الفصل|المادة)\s+(.+)$/);
    if(explicitSection){ beginSection(explicitSection[1]??normalized); continue; }

    const next=westernDigits(lines[index+1]?.trim()??'');
    if(normalized.includes('|')&&next.includes('|')&&isMarkdownDivider(next)){
      const headers=markdownCells(normalized);
      const rows:string[][]=[];
      index+=1;
      while(index+1<lines.length){
        const candidate=westernDigits(lines[index+1]?.trim()??'');
        if(!candidate||!candidate.includes('|')) break;
        rows.push(markdownCells(candidate));
        index+=1;
      }
      current.blocks.push({kind:'table',headers,rows});
      continue;
    }

    if(/^[-*•]+\s+/.test(normalized)){ pushClause(normalized.replace(/^[-*•]+\s+/,''),''); continue; }

    const explicitClause=normalized.match(/^(\d+(?:\.\d+)+|\d+|[أ-ي])\s*[.)-]?\s+(.+)$/u);
    if(explicitClause){
      const body=explicitClause[2]??'';
      const withSeparator=body.match(/^([^:–—-]+?)\s*(?::|[–—-])\s*(.+)$/);
      if(withSeparator) pushClause(withSeparator[2]??'',withSeparator[1]??'');
      else pushClause(body,'');
      continue;
    }

    const clause=parseClauseLine(normalized);
    if(clause){ pushClause(clause.text,clause.title); continue; }

    if(normalized.includes('→')){ pushFlow(normalized.split('→')); continue; }

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
  const documentMetadata=useMemo(()=>extractDocumentMetadata(documentContent),[documentContent]);
  const isFlowDocument=displayType==='procedure'||displayType==='mechanism';
  const isMatrixDocument=displayType==='matrix';


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
          <div><strong>{document.title}</strong><small>نوع الوثيقة: {displayLabel}</small></div>
          <LucideIcon name={document.kind==='record'?'listChecks':'landmark'} size={24}/>
        </section>

        <section className={styles.governedMetaStrip} aria-label="ملخص الوثيقة">
          <div className={styles.governedMetaType}><small>النوع</small><strong>{displayLabel}</strong></div>
          <div className={styles.governedMetaVersion}><small>الإصدار</small><strong>{documentMetadata.version||document.version?.replace(/^v/i,'')||'المعتمد'}</strong></div>
          <div className={styles.governedMetaStatus}><small>الحالة</small><strong>{documentMetadata.status||'سارية'}</strong></div>
          <div className={styles.governedMetaSource}><small>المصدر</small><strong>نماء</strong></div>
        </section>

        {displayType==='mechanism'&&<section className={styles.governedFlowCard}>
          <header><LucideIcon name="repeat2" size={20}/><div><strong>مسار الاعتماد</strong><small>المسار الحاكم حتى الاعتماد والنفاذ.</small></div></header>
          <ol className={styles.governedFlowSteps}>
            {['المحافظ','أمين السر','مجلس نماء الأعلى','اعتماد أو رفض','تاريخ النفاذ والإصدار'].map((label,index)=><li key={label}><span>{index+1}</span><strong>{label}</strong></li>)}
          </ol>
          <p>لا تستخدم النسخة المعدلة قبل اكتمال الاعتماد وبدء تاريخ النفاذ.</p>
        </section>}

        <details className={styles.governedDocumentSection} open>
          <summary><span>المحتوى الكامل</span><LucideIcon name="chevronDown" size={16}/></summary>
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
                            <div className={styles.governedClauseHeading}><span>{block.number}</span>{block.title&&<strong>{block.title}</strong>}</div>
                            {block.text&&<p>{block.text}</p>}
                          </article>
                          :block.kind==='flow'
                            ?<ol className={styles.governedInlineFlow} key={blockIndex}>{block.steps.map((step,stepIndex)=><li key={stepIndex}><span>{stepIndex+1}</span><strong>{step}</strong></li>)}</ol>
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
          <summary><span>طلبات التعديل والمناقشة</span><LucideIcon name="chevronDown" size={16}/></summary>
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

        {!formOpen?<button type="button" className={styles.primaryActionButton} onClick={()=>setFormOpen(true)}><LucideIcon name="pencil" size={20}/><span>طلب تعديل هذا المرجع</span></button>
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
