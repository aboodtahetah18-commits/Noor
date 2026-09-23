'use client';

// Contract alias retained for governed release check: تحميل نسخة PDF للاطلاع

// Contract aliases retained for governed release checks: تعديل إصلاحي / إملائي | طلب تعديل حوكمي

import Image from 'next/image';
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

type TypoCorrection={
  correctionId:string; documentRef:string; documentTitle:string; roomKey:string;
  clauseRef:string|null; currentRule:string; correctedRule:string; rationale:string;
  correctedAt:string; status:'APPLIED';
};

const statusLabel:Record<string,string>={
  GOVERNOR_REVIEW:'مراجعة المحافظ', SECRETARY_INTAKE:'لدى أمين السر',
  COUNCIL_DISCUSSION:'مناقشة مجلس نماء', APPROVED_PENDING_EFFECTIVE:'معتمد وينتظر النفاذ',
  EFFECTIVE:'نافذ', REJECTED:'مرفوض',
};

type DocumentBlock =
  | {kind:'paragraph';number:string|null;text:string}
  | {kind:'clause';number:string;title:string;text:string}
  | {kind:'table';headers:string[];rows:string[][]};
type DocumentSection={number:string;title:string;blocks:DocumentBlock[]};

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
  let current:DocumentSection|null=null;
  let fallbackSectionCounter=0;
  let fallbackClauseCounter=0;

  const pushCurrent=()=>{
    if(current&&current.blocks.length) sections.push(current);
  };
  const beginSection=(number:string,title:string)=>{
    pushCurrent();
    fallbackSectionCounter=Math.max(fallbackSectionCounter,Number(number)||0);
    fallbackClauseCounter=0;
    current={number:westernDigits(number),title:normalizeHeadingText(title)||'مادة',blocks:[]};
  };
  const ensureSection=()=>{
    if(current)return current;
    fallbackSectionCounter+=1;
    current={number:String(fallbackSectionCounter),title:'المحتوى المعتمد',blocks:[]};
    return current;
  };
  const pushClause=(number:string,text:string,title='البند')=>{
    const target=ensureSection();
    const cleaned=cleanDocumentText(text);
    const cleanedTitle=cleanDocumentText(title)||'البند';
    if(cleaned||cleanedTitle)target.blocks.push({kind:'clause',number:westernDigits(number),title:cleanedTitle,text:cleaned});
  };
  const pushParagraph=(text:string,number:string|null=null)=>{
    const cleaned=cleanDocumentText(text);
    if(cleaned)ensureSection().blocks.push({kind:'paragraph',number:number?westernDigits(number):null,text:cleaned});
  };

  for(let index=0;index<lines.length;index++){
    const raw=lines[index]??'';
    const trimmed=raw.trim();
    if(!trimmed)continue;
    const normalized=westernDigits(trimmed);

    if(/^(?:الإصدار|النوع|الحالة|الجهة المالكة|المرجعية العليا|المرجع الأعلى)\s*:/u.test(normalized))continue;

    const article=normalized.match(/^المادة\s+(\d+)\s*(?::|：|[–—-])?\s*(.*)$/u);
    if(article){
      beginSection(article[1]??String(fallbackSectionCounter+1),article[2]??'');
      continue;
    }

    const explicitClause=normalized.match(/^البند\s+(\d+(?:\.\d+)*)\s*(?::|：|[–—-])?\s*(.*)$/u);
    if(explicitClause){
      pushClause(explicitClause[1]??String(++fallbackClauseCounter),explicitClause[2]??'','البند');
      continue;
    }

    const explicitParagraph=normalized.match(/^الفقرة\s+(\d+(?:\.\d+)*)\s*(?::|：|[–—-])?\s*(.*)$/u);
    if(explicitParagraph){
      pushParagraph(explicitParagraph[2]??'',explicitParagraph[1]??null);
      continue;
    }

    const markdownHeading=normalized.match(/^(#{1,6})\s+(.+)$/);
    if(markdownHeading){
      const level=(markdownHeading[1]??'').length;
      const heading=markdownHeading[2]??'';
      if(level===1&&!sections.length&&!current)continue;
      if(level<=2){
        const numbered=heading.match(/^(\d+)\s*[.)-]?\s*(.*)$/);
        beginSection(numbered?.[1]??String(fallbackSectionCounter+1),numbered?.[2]??heading);
      }else{
        fallbackClauseCounter+=1;
        pushClause(ensureSection().number+'.'+String(fallbackClauseCounter),'',normalizeHeadingText(heading));
      }
      continue;
    }

    const topLevelNumbered=normalized.match(/^(\d+)\s*[.)-]\s+(.+)$/);
    if(topLevelNumbered){
      beginSection(topLevelNumbered[1]??String(fallbackSectionCounter+1),topLevelNumbered[2]??'');
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
      ensureSection().blocks.push({kind:'table',headers,rows});
      continue;
    }

    const legacyClause=normalized.match(/^(\d+(?:\.\d+)+)\s*[.)-]?\s+(.+)$/);
    if(legacyClause){
      const body=legacyClause[2]??'';
      const withSeparator=body.match(/^([^:–—-]+?)\s*(?::|[–—-])\s*(.+)$/);
      if(withSeparator)pushClause(legacyClause[1]??'',withSeparator[2]??'',withSeparator[1]??'البند');
      else pushClause(legacyClause[1]??'',body,'البند');
      continue;
    }

    const clause=parseClauseLine(normalized);
    if(clause){
      pushClause(clause.number,clause.text,clause.title);
      continue;
    }

    if(/\*\*[^*]+:\*\*/.test(normalized)||/\*\*[^*]+\*\*\s*:/.test(normalized)){
      for(const part of documentLineParts(normalized))pushParagraph(part);
      continue;
    }

    if(!sections.length&&!current&&/^(?:ميثاق|سياسة|لائحة|دليل|آليات|قاعدة|محرك|مصفوفة|تقرير)\b/u.test(cleanVisibleArabic(normalized)))continue;
    pushParagraph(normalized);
  }

  pushCurrent();
  return sections.filter(section=>section.blocks.length&&Boolean(section.title));
}

export function GovernedDocumentMobileSheet({document,roomKey,onClose}:{document:GovernedDocumentRef;roomKey:string;onClose:()=>void}){
  const [amendments,setAmendments]=useState<Amendment[]>([]);
  const [corrections,setCorrections]=useState<TypoCorrection[]>([]);
  const [documentContent,setDocumentContent]=useState('');
  const [documentLoading,setDocumentLoading]=useState(true);
  const [formOpen,setFormOpen]=useState(false);
  const [editMode,setEditMode]=useState<'typo'|'governance'>('governance');
  const [pending,setPending]=useState(false);
  const [feedback,setFeedback]=useState('');
  const [clauseRef,setClauseRef]=useState('');
  const [currentRule,setCurrentRule]=useState('');
  const [proposedRule,setProposedRule]=useState('');
  const [rationale,setRationale]=useState('');
  const [priority,setPriority]=useState<'NORMAL'|'NEXT_MEETING'|'URGENT'>('NEXT_MEETING');

  async function load(){
    const response=await fetch('/api/governance/amendments',{cache:'no-store'});
    const data=await response.json().catch(()=>({})) as {amendments?:Amendment[];corrections?:TypoCorrection[]};
    if(response.ok){
      setAmendments(Array.isArray(data.amendments)?data.amendments:[]);
      setCorrections(Array.isArray(data.corrections)?data.corrections:[]);
    }
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
  const relatedCorrections=useMemo(()=>corrections.filter(item=>item.documentRef===document.referenceCode),[corrections,document.referenceCode]);
  const history=useMemo(()=>{
    const typoItems=relatedCorrections.map(item=>({
      id:item.correctionId,at:item.correctedAt,type:'تعديل إملائي',status:'تم',
      summary:item.clauseRef?`تصحيح إملائي في ${item.clauseRef}: ${item.rationale}`:item.rationale,
      tone:'typo' as const,
    }));
    const governanceItems=related.flatMap(item=>{
      const items:Array<{id:string;at:string;type:string;status:string;summary:string;tone:'governance'|'decision'|'effective'}>=[{
        id:item.requestId+'-request',at:item.requestedAt,type:'طلب تعديل',
        status:statusLabel[item.status]??'قيد المعالجة',
        summary:item.clauseRef?`طلب تعديل ${item.clauseRef}: ${item.rationale}`:item.rationale,
        tone:'governance',
      }];
      if(item.councilDecisionAt) items.push({
        id:item.requestId+'-decision',at:item.councilDecisionAt,type:'قرار مجلس نماء الأعلى',
        status:item.status==='REJECTED'?'مرفوض':'معتمد',
        summary:item.status==='REJECTED'?'رفض المجلس طلب التعديل.':`اعتمد المجلس التعديل${item.nextVersion?' للإصدار '+item.nextVersion:''}.`,
        tone:'decision' as const,
      });
      if(item.effectiveAt) items.push({
        id:item.requestId+'-effective',at:item.effectiveAt,type:'اعتماد ونفاذ',
        status:'نافذ',summary:`بدأ نفاذ التعديل${item.nextVersion?' بالإصدار '+item.nextVersion:''}.`,tone:'effective' as const,
      });
      return items;
    });
    return [...typoItems,...governanceItems].sort((a,b)=>b.at.localeCompare(a.at));
  },[related,relatedCorrections]);
  const documentSections=useMemo(()=>parseGovernedDocument(documentContent),[documentContent]);
  const displayType=useMemo(()=>resolveGovernedDisplayType(document,documentContent),[document,documentContent]);
  const displayLabel=governedDisplayLabel(displayType);
  const isFlowDocument=displayType==='procedure'||displayType==='mechanism';
  const isMatrixDocument=displayType==='matrix';
  const displayDescription=governedDisplayDescription(displayType);
  const clauseTextByRef=useMemo(()=>{
    const map=new Map<string,string>();
    for(const section of documentSections){
      for(const block of section.blocks){
        if(block.kind!=='clause')continue;
        const value=[block.title,block.text].filter(Boolean).join('\n').trim();
        if(block.number&&value)map.set(westernDigits(block.number).trim(),value);
      }
    }
    return map;
  },[documentSections]);

  function updateClauseReference(value:string){
    const normalized=westernDigits(value).trim();
    setClauseRef(value);
    const matched=clauseTextByRef.get(normalized);
    if(matched!==undefined){
      setCurrentRule(matched);
      if(editMode==='typo'&&!proposedRule.trim())setProposedRule(matched);
    }
  }

  function openUnitEditor(reference:string,currentText:string){
    setEditMode('governance');
    setClauseRef(reference);
    setCurrentRule(currentText);
    setProposedRule(currentText);
    setRationale('');
    setFeedback('');
    setFormOpen(true);
  }

  function downloadLocalCopy(){
    if(!documentContent)return;
    const popup=globalThis.open('','_blank','noopener,noreferrer');
    if(!popup){
      setFeedback('تعذر فتح نسخة الاطلاع. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
      return;
    }
    const safeTitle=(document.title||'مرجع نماء').replace(/[<>&]/g,'');
    const safeContent=documentContent
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n/g,'<br/>');
    popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${safeTitle}</title><style>
      body{font-family:Arial,sans-serif;direction:rtl;margin:40px;line-height:1.9}
      h1{font-size:24px;margin-bottom:12px} .meta{margin-bottom:24px}
      .content{white-space:normal;font-size:15px} @media print{body{margin:18mm}}
    </style></head><body><h1>${safeTitle}</h1><div class="meta">نسخة للاطلاع — نماء</div><div class="content">${safeContent}</div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    popup.document.close();
  }


  async function submit(event:FormEvent){
    event.preventDefault(); if(pending)return; setPending(true); setFeedback('');
    try{
      const payload=editMode==='typo'
        ?{operation:'TYPO_CORRECTION' as const,documentRef:document.referenceCode,documentTitle:document.title,roomKey,
          clauseRef:clauseRef.trim()||null,currentRule:currentRule.trim(),correctedRule:proposedRule.trim(),rationale:rationale.trim()}
        :{operation:'CREATE' as const,documentRef:document.referenceCode,documentTitle:document.title,roomKey,
          clauseRef:clauseRef.trim()||null,currentRule:currentRule.trim()||null,proposedRule:proposedRule.trim(),rationale:rationale.trim(),priority};
      const response=await fetch('/api/governance/amendments',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),
      });
      const data=await response.json().catch(()=>({})) as {requestId?:string;correctionId?:string;error?:string};
      if(!response.ok) throw new Error(data.error||'REQUEST_FAILED');
      setFeedback(editMode==='typo'
        ?'تم تطبيق التصحيح المطبعي دون فتح مسار حوكمي أو إحالة إلى مجلس نماء الأعلى.'
        :'تم فتح طلب التعديل وإرساله للمراجعة.');
      setFormOpen(false); setClauseRef(''); setCurrentRule(''); setProposedRule(''); setRationale('');
      await load();
      if(editMode==='typo'){
        const responseDocument=await fetch('/api/governance/documents/'+encodeURIComponent(document.referenceCode),{cache:'no-store'});
        const next=await responseDocument.json().catch(()=>({})) as {document?:{content?:string}};
        if(responseDocument.ok)setDocumentContent(String(next.document?.content??''));
      }
    }catch{ setFeedback(editMode==='typo'?'تعذر تطبيق التصحيح الإملائي الآن.':'تعذر فتح طلب التعديل الآن.'); } finally{ setPending(false); }
  }

  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label={'تفاصيل '+document.title}>
    <aside className={styles.mobileSheet+' '+styles.governedDocumentSheet+' '+styles.mobileFullPageSheet}>
      <div className={styles.sheetHeader}><strong>تفاصيل المرجع الحاكم</strong><button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>
      <div className={styles.governedDocumentContent}>
        <section className={styles.governedDocumentHero}>
          <span className={styles.governedLeafPattern} aria-hidden="true"><i/><i/><i/></span>
          <div className={styles.governedHeroCopy}>
            <span className={styles.governedHeroEyebrow}><LucideIcon name="receiptText" size={16}/>{displayLabel}</span>
            <strong>{document.title}</strong>
            <p>{displayDescription}</p>
          </div>
          <span className={styles.governedHeroIcon} aria-hidden="true"><Image src="/brand/ndos/namaa-logo-white-transparent.png" alt="" width={64} height={64}/></span>
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
          <summary><span><LucideIcon name="receiptText" size={16}/><strong>تفاصيل المرجع</strong></span></summary>
          <div className={styles.governedLocalDocument}>
            {documentLoading
              ?<p>جارٍ تحميل المرجع المعتمد داخل نماء…</p>
              :documentContent
                ?<div className={styles.governedStructuredDocument}>
                  {documentSections.map((section,sectionIndex)=><details className={styles.governedContentSection+' '+(isMatrixDocument?styles.governedMatrixSection:'')+' '+(isFlowDocument?styles.governedFlowSection:'')} key={section.number+'-'+sectionIndex} open={sectionIndex===0||isMatrixDocument}>
                    <summary><span><LucideIcon name={sectionIcon(section.title,displayType)} size={16}/><strong>{'المادة ('+section.number+'): '+section.title}</strong></span></summary>
                    <div className={styles.governedContentSectionBody}>
                      <div className={styles.governedArticleAction}>
                        <button type="button" onClick={()=>openUnitEditor('المادة '+section.number,section.title)}><LucideIcon name="pencil" size={16}/>تعديل المادة</button>
                      </div>
                      {section.blocks.map((block,blockIndex)=>block.kind==='paragraph'
                        ?<article className={styles.governedParagraphRow} key={'p-'+blockIndex}>
                          <div className={styles.governedUnitToolbar}>
                            <strong>{block.number?'الفقرة ('+block.number+')':'فقرة'}</strong>
                            <button type="button" onClick={()=>openUnitEditor(block.number?'الفقرة '+block.number:'فقرة من المادة '+section.number,block.text)} aria-label="تعديل الفقرة"><LucideIcon name="pencil" size={16}/>تعديل</button>
                          </div>
                          <p>{block.text}</p>
                        </article>
                        :block.kind==='clause'
                          ?<article className={styles.governedClauseRow} key={'c-'+block.number+'-'+blockIndex}>
                            <div className={styles.governedUnitToolbar}>
                              <div className={styles.governedClauseHeading}><span>{'البند '+block.number}</span><strong>{block.title}</strong></div>
                              <button type="button" onClick={()=>openUnitEditor('البند '+block.number,[block.title,block.text].filter(Boolean).join('\n'))} aria-label={'تعديل البند '+block.number}><LucideIcon name="pencil" size={16}/>تعديل</button>
                            </div>
                            {block.text&&<p>{block.text}</p>}
                          </article>
                          :<div className={styles.governedTableScroll} key={'t-'+blockIndex}>
                          <table className={styles.governedContentTable}>
                            <thead><tr>{block.headers.map((header,headerIndex)=><th scope="col" key={headerIndex}>{header||'البيان'}</th>)}</tr></thead>
                            <tbody>{block.rows.map((row,rowIndex)=><tr key={rowIndex}>{block.headers.map((_,cellIndex)=><td key={cellIndex}>{row[cellIndex]||'غير محدد'}</td>)}</tr>)}</tbody>
                          </table>
                        </div>)}
                    </div>
                  </details>)}
                </div>
                :<p>تعذر تحميل النسخة المحلية الآن. المرجع محفوظ في نماء ويمكن إعادة المحاولة دون الرجوع إلى مصدر خارجي.</p>}
          </div>
        </details>

        <section className={styles.governedQuickActions} aria-label="إجراءات المرجع">
          <button type="button" className={styles.governedTypoButton} onClick={()=>{setEditMode('typo');setFormOpen(true);setFeedback('')}}>
            <LucideIcon name="pencil" size={24}/><span><strong>تعديل إملائي</strong></span>
          </button>
          <button type="button" className={styles.governedGovernanceButton} onClick={()=>{setEditMode('governance');setFormOpen(true);setFeedback('')}}>
            <LucideIcon name="landmark" size={24}/><span><strong>طلب تعديل</strong></span>
          </button>
          <button type="button" className={styles.governedPdfButton} onClick={downloadLocalCopy} disabled={!documentContent}>
            <LucideIcon name="receiptText" size={20}/><span><strong>تحميل PDF</strong></span>
          </button>
        </section>

        {formOpen&&<div className={styles.governedEditModal} role="dialog" aria-modal="true" aria-label={editMode==='typo'?'تعديل إملائي':'طلب تعديل'}>
          <button type="button" className={styles.governedEditModalScrim} aria-label="إغلاق" onClick={()=>setFormOpen(false)}/>
          <form className={styles.governedAmendmentForm+' '+styles.governedEditModalCard+' '+(editMode==='typo'?styles.governedTypoForm:styles.governedGovernanceForm)} onSubmit={submit}>
            <header className={styles.governedEditFormHeader}>
              <span className={styles.governedEditFormIcon}><LucideIcon name={editMode==='typo'?'pencil':'landmark'} size={20}/></span>
              <div><strong>{editMode==='typo'?'تعديل إملائي':'طلب تعديل'}</strong><small>{editMode==='typo'?'يصحح الخطأ دون تغيير المعنى أو الحكم.':'يغيّر المضمون أو الضابط ويمر بمسار المراجعة والاعتماد.'}</small></div>
              <button type="button" className={styles.governedEditClose} onClick={()=>setFormOpen(false)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button>
            </header>
            <label><span>المادة أو البند أو الفقرة</span><input value={clauseRef} onChange={e=>updateClauseReference(e.target.value)} placeholder="مثال: المادة 2، البند 2.1، الفقرة 2.1.1"/></label>
            <label><span>{editMode==='typo'?'النص الحالي كما يظهر':'النص أو الوضع الحالي'}</span><textarea required={editMode==='typo'} value={currentRule} onChange={e=>setCurrentRule(e.target.value)} placeholder="يظهر تلقائيًا عند إدخال رقم البند، ويمكن تعديله عند الحاجة"/></label>
            <label><span>{editMode==='typo'?'النص المصحح':'التعديل المقترح'}</span><textarea required value={proposedRule} onChange={e=>setProposedRule(e.target.value)} placeholder={editMode==='typo'?'ابدأ من النص الحالي وصحح المطلوب فقط':'اكتب التعديل المقترح بدقة'}/></label>
            <label><span>{editMode==='typo'?'سبب التصحيح':'مبرر التعديل'}</span><textarea required value={rationale} onChange={e=>setRationale(e.target.value)} placeholder={editMode==='typo'?'مثال: خطأ إملائي أو تحسين وضوح دون تغيير المعنى':'لماذا نحتاج هذا التعديل؟ وما أثره المتوقع؟'}/></label>
            {editMode==='governance'&&<label><span>الأولوية</span><select value={priority} onChange={e=>setPriority(e.target.value as typeof priority)}><option value="NORMAL">عادي</option><option value="NEXT_MEETING">للاجتماع القادم</option><option value="URGENT">عاجل، اجتماع فوري</option></select></label>}
            <p>{editMode==='typo'
              ?'يطبّق التصحيح على نسخة العرض ويسجل في سجل التحديثات، دون إنشاء قرار أو اعتماد حوكمي.'
              :'المسار: المحافظ، ثم أمين السر، ثم مجلس نماء الأعلى، ثم الاعتماد أو الرفض، ثم تاريخ النفاذ والإصدار الجديد.'}</p>
            <div className={styles.governedAmendmentActions}><button type="button" onClick={()=>setFormOpen(false)}>إلغاء</button><button type="submit" disabled={pending}>{pending?'جارٍ الحفظ…':editMode==='typo'?'حفظ التصحيح':'إرسال للمحافظ'}</button></div>
          </form>
        </div>}

        <section className={styles.governedHistorySection}>
          <header className={styles.governedHistoryHeader}>
            <span className={styles.governedHistoryIcon}><LucideIcon name="calendarDays" size={20}/></span>
            <div><strong>سجل التحديثات والقرارات</strong><small>التسلسل الزمني للتصحيحات، طلبات التعديل، الاعتمادات وقرارات مجلس نماء الأعلى.</small></div>
          </header>
          <div className={styles.governedHistoryList}>
            {!history.length&&<p className={styles.governedHistoryEmpty}>لا توجد تحديثات أو قرارات مرتبطة بهذا المرجع حتى الآن.</p>}
            {history.map(item=><article key={item.id} className={styles.governedHistoryItem+' '+styles['governedHistory_'+item.tone]}>
              <span className={styles.governedHistoryDot} aria-hidden="true"/>
              <div className={styles.governedHistoryMeta}><span>{item.type}</span><b>{item.status}</b></div>
              <strong>{item.summary}</strong>
              <time dateTime={item.at}>{new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.at))}</time>
            </article>)}
          </div>
        </section>
        {feedback&&<p className={styles.governedDocumentFeedback}>{feedback}</p>}
      </div>
    </aside>
  </div>;
}
