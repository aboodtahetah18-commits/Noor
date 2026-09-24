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
  clauseRef:string|null; parentRef:string|null; changeAction:'ADD'|'EDIT'|'DELETE'; unitType:'article'|'clause'|'paragraph';
  currentRule:string|null; proposedRule:string; rationale:string;
  priority:'NORMAL'|'NEXT_MEETING'|'URGENT'; status:string; requestedAt:string;
  governorReviewedAt:string|null; secretaryReceivedAt:string|null; councilDecisionAt:string|null;
  councilDecisionId:string|null; effectiveAt:string|null; nextVersion:string|null; discussionNotes:string[];
};

type TypoCorrection={
  correctionId:string; documentRef:string; documentTitle:string; roomKey:string;
  clauseRef:string|null; currentRule:string; correctedRule:string; rationale:string;
  correctedAt:string; status:'APPLIED';
};
type DirectChange={
  changeId:string; documentRef:string; documentTitle:string; roomKey:string;
  unitRef:string; parentRef:string|null; changeAction:'ADD'|'EDIT'|'DELETE'; unitType:'article'|'clause'|'paragraph';
  currentRule:string|null; proposedRule:string; rationale:string; changedAt:string; status:'APPLIED';
};

const statusLabel:Record<string,string>={
  GOVERNOR_REVIEW:'مراجعة المحافظ', SECRETARY_INTAKE:'لدى أمين السر',
  COUNCIL_DISCUSSION:'مناقشة مجلس نماء', APPROVED_PENDING_EFFECTIVE:'معتمد وينتظر النفاذ',
  EFFECTIVE:'نافذ', REJECTED:'مرفوض',
};

type DocumentBlock =
  | {kind:'paragraph';number:string|null;text:string;sourceText:string}
  | {kind:'clause';number:string;title:string;text:string;sourceText:string}
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
function splitClauseContent(value:string){
  const match=value.match(/^(.*?)(?:\s+مثال\s*:\s*)(.+)$/u);
  return {
    explanation:(match?.[1]??value).trim(),
    example:(match?.[2]??'').trim(),
  };
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
function governedDocumentStatus(content:string){
  const match=content.match(/^الحالة\s*:\s*(.+)$/mu);
  const raw=match?.[1]?.trim()??'';
  if(!raw)return 'معتمد';
  const cleaned=cleanVisibleArabic(raw);
  if(/جاهز للاعتماد|جاهزة للاعتماد/u.test(cleaned))return 'معتمد';
  return cleaned||'معتمد';
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
  let fallbackParagraphCounter=0;

  const pushCurrent=()=>{
    if(current&&current.blocks.length) sections.push(current);
  };
  const beginSection=(number:string,title:string)=>{
    pushCurrent();
    fallbackSectionCounter=Math.max(fallbackSectionCounter,Number(number)||0);
    fallbackClauseCounter=0;
    fallbackParagraphCounter=0;
    current={number:westernDigits(number),title:normalizeHeadingText(title)||'مادة',blocks:[]};
  };
  const ensureSection=()=>{
    if(current)return current;
    fallbackSectionCounter+=1;
    current={number:String(fallbackSectionCounter),title:'المحتوى المعتمد',blocks:[]};
    return current;
  };
  const pushClause=(number:string,text:string,title='البند',sourceText=text)=>{
    const target=ensureSection();
    const cleaned=cleanDocumentText(text);
    const cleanedTitle=cleanDocumentText(title)||'البند';
    if(cleaned||cleanedTitle)target.blocks.push({kind:'clause',number:westernDigits(number),title:cleanedTitle,text:cleaned,sourceText});
  };
  const pushParagraph=(text:string,number:string|null=null,sourceText=text)=>{
    const cleaned=cleanDocumentText(text);
    if(!cleaned)return;
    const target=ensureSection();
    fallbackParagraphCounter+=1;
    const resolved=number?westernDigits(number):target.number+'.'+String(fallbackParagraphCounter);
    target.blocks.push({kind:'paragraph',number:resolved,text:cleaned,sourceText});
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
      pushClause(explicitClause[1]??String(++fallbackClauseCounter),explicitClause[2]??'','البند',raw);
      continue;
    }

    const explicitParagraph=normalized.match(/^الفقرة\s+(\d+(?:\.\d+)*)\s*(?::|：|[–—-])?\s*(.*)$/u);
    if(explicitParagraph){
      pushParagraph(explicitParagraph[2]??'',explicitParagraph[1]??null,raw);
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
        pushClause(ensureSection().number+'.'+String(fallbackClauseCounter),'',normalizeHeadingText(heading),raw);
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
      if(withSeparator)pushClause(legacyClause[1]??'',withSeparator[2]??'',withSeparator[1]??'البند',raw);
      else pushClause(legacyClause[1]??'',body,'البند',raw);
      continue;
    }

    const clause=parseClauseLine(normalized);
    if(clause){
      pushClause(clause.number,clause.text,clause.title,raw);
      continue;
    }

    if(/\*\*[^*]+:\*\*/.test(normalized)||/\*\*[^*]+\*\*\s*:/.test(normalized)){
      for(const part of documentLineParts(normalized))pushParagraph(part,null,raw);
      continue;
    }

    if(!sections.length&&!current&&/^(?:ميثاق|سياسة|لائحة|دليل|آليات|قاعدة|محرك|مصفوفة|تقرير)\b/u.test(cleanVisibleArabic(normalized)))continue;
    pushParagraph(normalized,null,raw);
  }

  pushCurrent();
  return sections.filter(section=>section.blocks.length&&Boolean(section.title));
}

export function GovernedDocumentMobileSheet({document,roomKey,onClose}:{document:GovernedDocumentRef;roomKey:string;onClose:()=>void}){
  const [amendments,setAmendments]=useState<Amendment[]>([]);
  const [directChanges,setDirectChanges]=useState<DirectChange[]>([]);
  const [corrections,setCorrections]=useState<TypoCorrection[]>([]);
  const [documentContent,setDocumentContent]=useState('');
  const [documentLoading,setDocumentLoading]=useState(true);
  const [formOpen,setFormOpen]=useState(false);
  const [editMode,setEditMode]=useState<'direct'|'governance'>('direct');
  const [changeAction,setChangeAction]=useState<'ADD'|'EDIT'|'DELETE'>('EDIT');
  const [unitType,setUnitType]=useState<'article'|'clause'|'paragraph'>('paragraph');
  const [parentRef,setParentRef]=useState('');
  const [pending,setPending]=useState(false);
  const [feedback,setFeedback]=useState('');
  const [clauseRef,setClauseRef]=useState('');
  const [currentRule,setCurrentRule]=useState('');
  const [proposedRule,setProposedRule]=useState('');
  const [exampleText,setExampleText]=useState('');
  const [rationale,setRationale]=useState('');
  const [priority,setPriority]=useState<'NORMAL'|'NEXT_MEETING'|'URGENT'>('NEXT_MEETING');

  async function load(){
    const response=await fetch('/api/governance/amendments',{cache:'no-store'});
    const data=await response.json().catch(()=>({})) as {amendments?:Amendment[];directChanges?:DirectChange[];corrections?:TypoCorrection[]};
    if(response.ok){
      setAmendments(Array.isArray(data.amendments)?data.amendments:[]);
      setDirectChanges(Array.isArray(data.directChanges)?data.directChanges:[]);
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
  const relatedDirect=useMemo(()=>{
    const items=directChanges.filter(item=>item.documentRef===document.referenceCode);
    const seen=new Set<string>();
    return items.filter(item=>{
      const key=[
        item.documentRef,item.unitType,item.unitRef,item.changeAction,item.parentRef??'',item.currentRule??'',item.proposedRule,
      ].join('\u001f');
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });
  },[directChanges,document.referenceCode]);
  const relatedCorrections=useMemo(()=>corrections.filter(item=>item.documentRef===document.referenceCode),[corrections,document.referenceCode]);
  const history=useMemo(()=>{
    const typoItems=relatedCorrections.map(item=>({
      id:item.correctionId,at:item.correctedAt,type:'تعديل إملائي',status:'تم',
      summary:item.clauseRef?`تصحيح إملائي في ${item.clauseRef}: ${item.rationale}`:item.rationale,
      tone:'typo' as const,
    }));
    const directItems=relatedDirect.map(item=>({
      id:item.changeId,at:item.changedAt,type:item.changeAction==='ADD'?'إضافة مباشرة':item.changeAction==='DELETE'?'حذف مباشر':'تعديل مباشر',status:'تم',
      summary:(item.changeAction==='ADD'?'إضافة ':item.changeAction==='DELETE'?'حذف ':'تعديل ')+item.unitRef+(item.rationale?': '+item.rationale:''),
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
    return [...typoItems,...directItems,...governanceItems].sort((a,b)=>b.at.localeCompare(a.at));
  },[related,relatedCorrections,relatedDirect]);
  const documentSections=useMemo(()=>parseGovernedDocument(documentContent),[documentContent]);
  const displayType=useMemo(()=>resolveGovernedDisplayType(document,documentContent),[document,documentContent]);
  const displayLabel=governedDisplayLabel(displayType);
  const isFlowDocument=displayType==='procedure'||displayType==='mechanism';
  const isMatrixDocument=displayType==='matrix';
  const displayDescription=governedDisplayDescription(displayType);
  const documentStatus=useMemo(()=>governedDocumentStatus(documentContent),[documentContent]);
  const unitOptions=useMemo(()=>{
    const items:Array<{ref:string;type:'article'|'clause'|'paragraph';label:string;text:string;raw:string;example:string;parentRef:string|null}>=[];
    for(const section of documentSections){
      items.push({ref:section.number,type:'article',label:'المادة '+section.number,text:section.title,raw:section.title,example:'',parentRef:null});
      for(const block of section.blocks){
        if(block.kind==='clause'){
          const parts=splitClauseContent(block.text||block.title);
          items.push({ref:block.number,type:'clause',label:'البند '+block.number,text:parts.explanation||block.title,raw:block.sourceText||block.text||block.title,example:parts.example,parentRef:section.number});
        }else if(block.kind==='paragraph'&&block.number){
          const parent=block.number.split('.').slice(0,-1).join('.');
          items.push({ref:block.number,type:'paragraph',label:'الفقرة '+block.number,text:block.text,raw:block.sourceText||block.text,example:'',parentRef:parent});
        }
      }
    }
    return items;
  },[documentSections]);

  const articleOptions=useMemo(()=>unitOptions.filter(item=>item.type==='article'),[unitOptions]);
  const clauseOptions=useMemo(()=>unitOptions.filter(item=>item.type==='clause'),[unitOptions]);

  function nextUnitRef(type:'article'|'clause'|'paragraph',parent:string){
    if(type==='article'){
      const max=Math.max(0,...articleOptions.map(item=>Number(item.ref)||0));
      return String(max+1);
    }
    if(type==='clause'){
      const article=parent.replace(/^المادة\s+/u,'').trim();
      const siblings=clauseOptions.filter(item=>item.ref.startsWith(article+'.'));
      const max=Math.max(0,...siblings.map(item=>Number(item.ref.split('.').at(-1))||0));
      return article+'.'+String(max+1);
    }
    const clause=parent.replace(/^البند\s+/u,'').trim();
    const siblings=unitOptions.filter(item=>item.type==='paragraph'&&item.ref.startsWith(clause+'.'));
    const max=Math.max(0,...siblings.map(item=>Number(item.ref.split('.').at(-1))||0));
    return clause+'.'+String(max+1);
  }

  function resetEditor(mode:'direct'|'governance',action:'ADD'|'EDIT'|'DELETE'='EDIT'){
    setEditMode(mode);
    setChangeAction(action);
    setUnitType('paragraph');
    setParentRef('');
    setClauseRef('');
    setCurrentRule('');
    setProposedRule('');
    setExampleText('');
    setRationale('');
    setFeedback('');
    setFormOpen(true);
  }

  function chooseExistingUnit(value:string){
    const [rawType,...refParts]=value.split(':');
    const ref=refParts.join(':');
    const item=unitOptions.find(candidate=>candidate.type===rawType&&candidate.ref===ref);
    setClauseRef(ref);
    if(!item){setCurrentRule('');setProposedRule('');setExampleText('');return}
    setUnitType(item.type);
    setParentRef(item.parentRef??'');
    setCurrentRule(item.raw);
    setProposedRule(item.text);
    setExampleText(item.example);
  }

  function updateAddTarget(type:'article'|'clause'|'paragraph',parent:string){
    setUnitType(type);
    setParentRef(parent);
    if(type==='article')setClauseRef(nextUnitRef(type,''));
    else if(parent)setClauseRef(nextUnitRef(type,parent));
    else setClauseRef('');
    setCurrentRule('');
    setProposedRule('');
    setExampleText('');
  }

  function openUnitEditor(type:'article'|'clause'|'paragraph',reference:string,currentText:string,parent:string|null,sourceText?:string){
    const parts=type==='clause'?splitClauseContent(currentText):{explanation:currentText,example:''};
    setEditMode('direct');
    setChangeAction('EDIT');
    setUnitType(type);
    setParentRef(parent??'');
    setClauseRef(reference);
    setCurrentRule(sourceText??currentText);
    setProposedRule(parts.explanation);
    setExampleText(parts.example);
    setRationale('');
    setFeedback('');
    setFormOpen(true);
  }


  async function submit(event:FormEvent){
    event.preventDefault();
    if(pending||!clauseRef.trim()||(changeAction!=='DELETE'&&!proposedRule.trim()))return;
    setPending(true); setFeedback('');
    try{
      const unitLabel=unitType==='article'?'المادة':unitType==='clause'?'البند':'الفقرة';
      const composedRule=changeAction==='DELETE'
        ?(currentRule.trim()||'حذف العنصر')
        :unitType==='clause'&&exampleText.trim()
          ?proposedRule.trim()+' مثال: '+exampleText.trim()
          :proposedRule.trim();
      const actionLabel=changeAction==='ADD'?'إضافة':changeAction==='DELETE'?'حذف':'تعديل';
      const common={
        documentRef:document.referenceCode,documentTitle:document.title,roomKey,
        parentRef:parentRef.trim()||null,changeAction,unitType,
        currentRule:currentRule.trim()||null,proposedRule:composedRule,
        rationale:rationale.trim()||(actionLabel+' مباشر خلال مرحلة التأسيس'),
      };
      const payload=editMode==='direct'
        ?{operation:'DIRECT_CHANGE' as const,...common,unitRef:clauseRef.trim()}
        :{operation:'CREATE' as const,...common,clauseRef:unitLabel+' '+clauseRef.trim(),priority,
          rationale:rationale.trim()||'تغيير حوكمي يتطلب المراجعة والاعتماد قبل النفاذ'};
      const response=await fetch('/api/governance/amendments',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),
      });
      const data=await response.json().catch(()=>({})) as {requestId?:string;changeId?:string;error?:string};
      if(!response.ok) throw new Error(data.error||'REQUEST_FAILED');
      setFeedback(editMode==='direct'
        ?'تم تطبيق '+actionLabel+' مباشرة وتسجيلها في سجل التحديثات.'
        :'تم فتح طلب '+actionLabel+' حوكمي وإرساله للمراجعة.');
      setFormOpen(false); setClauseRef(''); setCurrentRule(''); setProposedRule(''); setExampleText(''); setRationale(''); setParentRef('');
      await load();
      if(editMode==='direct'){
        const responseDocument=await fetch('/api/governance/documents/'+encodeURIComponent(document.referenceCode),{cache:'no-store'});
        const next=await responseDocument.json().catch(()=>({})) as {document?:{content?:string}};
        if(responseDocument.ok)setDocumentContent(String(next.document?.content??''));
      }
    }catch{
      setFeedback(editMode==='direct'?'تعذر تطبيق التحرير المباشر الآن.':'تعذر فتح الطلب الحوكمي الآن.');
    }finally{setPending(false)}
  }

  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label={'تفاصيل '+document.title}>
    <aside className={styles.mobileSheet+' '+styles.governedDocumentSheet+' '+styles.mobileFullPageSheet+' ux-dialog-surface namaa-governed-document-dialog'}>
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
            <div><small>الحالة</small><strong className={styles.governedStatusActive}>{documentStatus}</strong></div>
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
                  {documentSections.map((section,sectionIndex)=><details className={styles.governedContentSection+' namaa-governed-article '+(isMatrixDocument?styles.governedMatrixSection:'')+' '+(isFlowDocument?styles.governedFlowSection:'')} key={section.number+'-'+sectionIndex} open={sectionIndex===0||isMatrixDocument}>
                    <summary><span><LucideIcon name={sectionIcon(section.title,displayType)} size={16}/><strong>{'المادة ('+section.number+'): '+section.title}</strong></span><small>إظهار / إخفاء</small></summary>
                    <div className={styles.governedContentSectionBody+' namaa-governed-article-body'}>
                      <div className={styles.governedArticleAction+' namaa-governed-unit-actions'}>
                        <button type="button" onClick={()=>openUnitEditor('article',section.number,section.title,null)}><LucideIcon name="pencil" size={16}/>تعديل / حذف</button>
                      </div>
                      {section.blocks.map((block,blockIndex)=>block.kind==='paragraph'
                        ?<article className={styles.governedParagraphRow+' namaa-governed-paragraph'} key={'p-'+blockIndex}>
                          <div className={styles.governedUnitToolbar+' namaa-governed-unit-toolbar'}>
                            <strong>{block.number?'الفقرة ('+block.number+')':'فقرة'}</strong>
                            {block.number&&<button type="button" onClick={()=>openUnitEditor('paragraph',block.number??'',block.text,(block.number??'').split('.').slice(0,-1).join('.'),block.sourceText)} aria-label="تعديل الفقرة"><LucideIcon name="pencil" size={16}/>تعديل / حذف</button>}
                          </div>
                          <p>{block.text}</p>
                        </article>
                        :block.kind==='clause'
                          ?<article className={styles.governedClauseRow+' namaa-governed-clause'} key={'c-'+block.number+'-'+blockIndex}>
                            <div className={styles.governedUnitToolbar+' namaa-governed-unit-toolbar'}>
                              <div className={styles.governedClauseHeading+' namaa-governed-clause-heading'}><span>{'البند '+block.number}</span><strong>{block.title}</strong></div>
                              <button type="button" onClick={()=>openUnitEditor('clause',block.number,block.text||block.title,section.number,block.sourceText)} aria-label={'تعديل البند '+block.number}><LucideIcon name="pencil" size={16}/>تعديل / حذف</button>
                            </div>
                            {block.text&&<div className={styles.governedClauseDetails+' namaa-governed-clause-details'}>
                              <div><small>الشرح</small><p>{splitClauseContent(block.text).explanation}</p></div>
                              <div><small>مثال</small><p>{splitClauseContent(block.text).example||'لم يضف مثال لهذا البند بعد.'}</p></div>
                            </div>}
                          </article>
                          :<div className={styles.governedTableScroll+' namaa-governed-table-wrap'} key={'t-'+blockIndex}>
                          <table className={styles.governedContentTable+' ux-table'}>
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

        <section className={styles.governedQuickActions+' namaa-governed-quick-actions'} aria-label="إجراءات المرجع">
          <button type="button" className={styles.governedTypoButton+' ux-button ux-button--secondary'} onClick={()=>resetEditor('direct','EDIT')}>
            <LucideIcon name="pencil" size={24}/><span><strong>تحرير مباشر</strong></span>
          </button>
          <button type="button" className={styles.governedGovernanceButton+' ux-button ux-button--primary'} onClick={()=>resetEditor('governance','EDIT')}>
            <LucideIcon name="landmark" size={24}/><span><strong>تحرير حوكمي</strong></span>
          </button>
        </section>

        {formOpen&&<div className={styles.governedEditModal} role="dialog" aria-modal="true" aria-label={editMode==='direct'?'تحرير مباشر':'تحرير حوكمي'}>
          <button type="button" className={styles.governedEditModalScrim} aria-label="إغلاق" onClick={()=>setFormOpen(false)}/>
          <form className={styles.governedAmendmentForm+' '+styles.governedEditModalCard+' ux-dialog-surface namaa-governance-editor-dialog '+(editMode==='direct'?styles.governedTypoForm:styles.governedGovernanceForm)} onSubmit={submit}>
            <header className={styles.governedEditFormHeader}>
              <span className={styles.governedEditFormIcon}><LucideIcon name={editMode==='direct'?'pencil':'landmark'} size={20}/></span>
              <div><strong>{editMode==='direct'?'تحرير مباشر':'تحرير حوكمي'}</strong><small>{editMode==='direct'?'إضافة أو تعديل أو حذف مباشر خلال مرحلة ضبط المنصة.':'إضافة أو تعديل أو حذف يمر بالاجتماع والمراجعة والاعتماد قبل النفاذ.'}</small></div>
              <button type="button" className={styles.governedEditClose+' ux-button ux-button--ghost'} onClick={()=>setFormOpen(false)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button>
            </header>

            <label><span>نوع العملية</span><select className="ux-control" value={changeAction} onChange={e=>{
              const action=e.target.value as typeof changeAction;
              const previous=changeAction;
              setChangeAction(action);
              if(action==='ADD') updateAddTarget('paragraph','');
              else if(previous==='ADD'){setClauseRef('');setParentRef('');setCurrentRule('');setProposedRule('');setExampleText('')}
            }}>
              <option value="ADD">إضافة</option>
              <option value="EDIT">تعديل</option>
              <option value="DELETE">حذف</option>
            </select></label>

            {changeAction==='ADD'
              ?<>
                <label><span>نوع الإضافة</span><select className="ux-control" value={unitType} onChange={e=>updateAddTarget(e.target.value as typeof unitType,'')}>
                  <option value="article">مادة</option><option value="clause">بند</option><option value="paragraph">فقرة</option>
                </select></label>
                {unitType==='clause'&&<label><span>تحت المادة</span><select className="ux-control" value={parentRef} onChange={e=>updateAddTarget('clause',e.target.value)}>
                  <option value="">اختر المادة</option>{articleOptions.map(item=><option key={item.ref} value={item.ref}>{item.label}</option>)}
                </select></label>}
                {unitType==='paragraph'&&<label><span>تحت البند</span><select className="ux-control" value={parentRef} onChange={e=>updateAddTarget('paragraph',e.target.value)}>
                  <option value="">اختر البند</option>{clauseOptions.map(item=><option key={item.ref} value={item.ref}>{item.label}</option>)}
                </select></label>}
                <label><span>الترقيم</span><input className="ux-control" value={clauseRef} readOnly placeholder="يُنشأ تلقائيًا"/></label>
              </>
              :<label><span>العنصر</span><select className="ux-control" value={clauseRef?unitType+':'+clauseRef:''} onChange={e=>chooseExistingUnit(e.target.value)}>
                <option value="">اختر المادة أو البند أو الفقرة</option>{unitOptions.map(item=><option key={item.type+'-'+item.ref} value={item.type+':'+item.ref}>{item.label}</option>)}
              </select></label>}

            {changeAction!=='ADD'&&<label><span>النص الحالي</span><textarea className="ux-control" value={currentRule} readOnly/></label>}
            {changeAction!=='DELETE'&&unitType==='clause'&&<>
              <label><span>شرح البند</span><textarea className="ux-control" required value={proposedRule} onChange={e=>setProposedRule(e.target.value)} placeholder="اكتب شرح البند بوضوح"/></label>
              <label><span>مثال</span><textarea className="ux-control" value={exampleText} onChange={e=>setExampleText(e.target.value)} placeholder="أضف مثالًا عمليًا يوضح البند"/></label>
            </>}
            {changeAction!=='DELETE'&&unitType!=='clause'&&<label><span>{changeAction==='ADD'?'النص الجديد':'النص المعدل'}</span><textarea className="ux-control" required value={proposedRule} onChange={e=>setProposedRule(e.target.value)} placeholder={changeAction==='ADD'?'اكتب محتوى العنصر الجديد':'عدّل النص المطلوب'}/></label>}
            {changeAction==='DELETE'&&<p className={styles.governedDeleteNotice}>سيتم حذف {unitType==='article'?'المادة وما يندرج تحتها':unitType==='clause'?'البند وما يندرج تحته':'الفقرة المحددة'} من نسخة العرض. في المسار الحوكمي لا يصبح الحذف نافذًا إلا بعد الاعتماد.</p>}
            <label><span>{editMode==='direct'?'ملاحظة':'مبرر التغيير'}</span><textarea className="ux-control" required={editMode==='governance'} value={rationale} onChange={e=>setRationale(e.target.value)} placeholder={editMode==='direct'?'اختياري خلال مرحلة التأسيس':'اشرح سبب الإضافة أو التعديل أو الحذف وأثره'}/></label>
            {editMode==='governance'&&<label><span>الأولوية</span><select className="ux-control" value={priority} onChange={e=>setPriority(e.target.value as typeof priority)}><option value="NORMAL">عادي</option><option value="NEXT_MEETING">للاجتماع القادم</option><option value="URGENT">عاجل، اجتماع فوري</option></select></label>}
            <p>{editMode==='direct'
              ?'يطبق التغيير فورًا في نسخة العرض الحالية ويسجل أثره. هذا المسار مخصص لمرحلة ضبط المنصة.'
              :'المسار: المحافظ، ثم أمين السر، ثم مجلس نماء الأعلى، ثم الاعتماد أو الرفض، ثم تاريخ النفاذ والإصدار الجديد.'}</p>
            <div className={styles.governedAmendmentActions}><button type="button" className="ux-button ux-button--secondary" onClick={()=>setFormOpen(false)}>إلغاء</button><button type="submit" className="ux-button ux-button--primary" disabled={pending||!clauseRef.trim()||(changeAction!=='DELETE'&&!proposedRule.trim())}>{pending?'جارٍ الحفظ…':changeAction==='DELETE'?(editMode==='direct'?'حذف مباشر':'طلب الحذف'):(editMode==='direct'?'حفظ مباشر':'إرسال للمحافظ')}</button></div>
          </form>
        </div>}

        <section className={styles.governedHistorySection+' namaa-governed-history'}>
          <header className={styles.governedHistoryHeader+' namaa-governed-history-header'}>
            <span className={styles.governedHistoryIcon}><LucideIcon name="calendarDays" size={20}/></span>
            <div><strong>سجل التحديثات والقرارات</strong><small>التسلسل الزمني للتصحيحات، طلبات التعديل، الاعتمادات وقرارات مجلس نماء الأعلى.</small></div>
          </header>
          <div className={styles.governedHistoryList+' namaa-governed-history-list'}>
            {!history.length&&<p className={styles.governedHistoryEmpty}>لا توجد تحديثات أو قرارات مرتبطة بهذا المرجع حتى الآن.</p>}
            {history.map(item=><article key={item.id} className={styles.governedHistoryItem+' namaa-governed-history-item '+styles['governedHistory_'+item.tone]}>
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
