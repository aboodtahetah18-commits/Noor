'use client';

// Contract aliases retained for governed release checks: تعديل إصلاحي / إملائي | طلب تعديل حوكمي

import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import type { AlgorithmRoleRef } from '@/lib/governance/algorithm-role-registry';
import { governedRoomDetails } from '@/lib/conversations/governed-room-details';
import { NAMAA_PERSONA_ASSETS } from './persona-assets';
import styles from './conversation-workspace.module.css';

const policyTitle=(ref:string)=>{
  for(const detail of Object.values(governedRoomDetails)){
    const item=[...detail.policies,...detail.records].find(entry=>entry.referenceCode===ref);
    if(item) return item.title;
  }
  return null;
};

const roleAvatar=NAMAA_PERSONA_ASSETS;

function RoleItems({items,prefix}:{items:string[];prefix:string}){
  return <div className={styles.algorithmRoleItems}>
    {items.length?items.map((item,index)=><article key={prefix+'-'+index} className={styles.algorithmRoleItem}>
      <span>{prefix}.{index+1}</span>
      <p>{item}</p>
    </article>):<p className={styles.algorithmRoleEmpty}>لا توجد بنود إضافية ضمن هذا القسم.</p>}
  </div>;
}

function RoleSection({number,title,items}:{number:number;title:string;items:string[]}){
  if(!items.length)return null;
  return <section className={styles.algorithmRoleSection}>
    <header><small>المادة {number}</small><strong>{title}</strong></header>
    <RoleItems prefix={String(number)} items={items}/>
  </section>;
}

type RoleCorrection={documentRef:string;currentRule:string;correctedRule:string;correctedAt:string};
type RoleAmendment={documentRef:string;currentRule:string|null;proposedRule:string;status:string;requestedAt:string};

function applyRoleEdits(value:string,corrections:RoleCorrection[],amendments:RoleAmendment[]){
  let next=value;
  const edits=[
    ...corrections.map(item=>({from:item.currentRule,to:item.correctedRule,at:item.correctedAt})),
    ...amendments.filter(item=>item.status==='EFFECTIVE'&&item.currentRule).map(item=>({from:item.currentRule??'',to:item.proposedRule,at:item.requestedAt})),
  ].sort((a,b)=>a.at.localeCompare(b.at));
  for(const edit of edits){
    if(edit.from&&next.includes(edit.from)) next=next.replace(edit.from,edit.to);
  }
  return next;
}

export function AlgorithmRoleMobileSheet({role,onClose}:{role:AlgorithmRoleRef;onClose:()=>void}){
  const [corrections,setCorrections]=useState<RoleCorrection[]>([]);
  const [amendments,setAmendments]=useState<RoleAmendment[]>([]);
  const [editMode,setEditMode]=useState<'typo'|'governance'|null>(null);
  const [clauseRef,setClauseRef]=useState('');
  const [currentRule,setCurrentRule]=useState('');
  const [proposedRule,setProposedRule]=useState('');
  const [rationale,setRationale]=useState('');
  const [priority,setPriority]=useState<'NORMAL'|'NEXT_MEETING'|'URGENT'>('NORMAL');
  const [pending,setPending]=useState(false);
  const [feedback,setFeedback]=useState('');
  const documentRef=role.referenceCode;
  const documentTitle='الوصف الوظيفي — '+role.name;

  useEffect(()=>{
    let cancelled=false;
    fetch('/api/governance/amendments',{cache:'no-store'})
      .then(async response=>response.ok?response.json():null)
      .then(data=>{
        if(cancelled||!data)return;
        setCorrections(Array.isArray(data.corrections)?data.corrections.filter((item:RoleCorrection)=>item.documentRef===documentRef):[]);
        setAmendments(Array.isArray(data.amendments)?data.amendments.filter((item:RoleAmendment)=>item.documentRef===documentRef):[]);
      })
      .catch(()=>{});
    return()=>{cancelled=true};
  },[documentRef]);

  const editText=(value:string)=>applyRoleEdits(value,corrections,amendments);
  const policyTitles=role.policyRefs.map(ref=>policyTitle(ref)).filter((title):title is string=>Boolean(title)).map(editText);
  const sections=[
    {title:'المسؤوليات الرئيسية',items:role.accountableFor},
    {title:'الصلاحيات داخل التفويض',items:role.authorities},
    {title:'القرارات التي يملكها أو يرفعها',items:role.decisions??[]},
    {title:'المدخلات والبيانات التي يعتمد عليها',items:role.inputs??[]},
    {title:'المخرجات التي يصدرها',items:role.outputs??[]},
    {title:'العلاقات مع الجهات الأخرى',items:role.relations??[]},
    {title:'مؤشرات الأداء',items:role.kpis},
    {title:'محفزات وحالات التصعيد',items:role.escalation},
    {title:'الحدود والمحظورات',items:role.prohibited},
    {title:'الإشعارات والمتابعة',items:role.notifications??[]},
    {title:'سجل التدقيق والتتبع',items:role.audit??[]},
    {title:'الشاشات والواجهات المرتبطة',items:role.interfaces??[]},
    {title:'حالات الخطأ والاستثناء',items:role.exceptions??[]},
    {title:'السياسات والمراجع الحاكمة',items:policyTitles},
  ].map(section=>({...section,items:section.items.map(editText)})).filter(section=>section.items.length);
  const clauseTextByRef=new Map<string,string>();
  clauseTextByRef.set('1.1',editText(role.mandate));
  sections.forEach((section,index)=>{
    const prefix=String(index+2);
    section.items.forEach((item,itemIndex)=>clauseTextByRef.set(prefix+'.'+String(itemIndex+1),item));
  });
  function updateClauseReference(value:string){
    const normalized=value.trim().replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    setClauseRef(value);
    const matched=clauseTextByRef.get(normalized);
    if(matched!==undefined){
      setCurrentRule(matched);
      if(editMode==='typo'&&!proposedRule.trim())setProposedRule(matched);
    }
  }

  async function submitEdit(event:FormEvent){
    event.preventDefault();
    if(!editMode||pending)return;
    setPending(true);
    setFeedback('');
    try{
      const payload=editMode==='typo'
        ?{operation:'TYPO_CORRECTION' as const,documentRef,documentTitle,roomKey:'central',clauseRef:clauseRef.trim()||null,currentRule:currentRule.trim(),correctedRule:proposedRule.trim(),rationale:rationale.trim()}
        :{operation:'CREATE' as const,documentRef,documentTitle,roomKey:'central',clauseRef:clauseRef.trim()||null,currentRule:currentRule.trim()||null,proposedRule:proposedRule.trim(),rationale:rationale.trim(),priority};
      const response=await fetch('/api/governance/amendments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>({})) as {error?:string};
      if(!response.ok)throw new Error(data.error||'REQUEST_FAILED');
      setFeedback(editMode==='typo'?'تم تطبيق التصحيح الإملائي وتسجيله.':'تم فتح طلب التعديل وإرساله لمسار الاعتماد.');
      setEditMode(null);setClauseRef('');setCurrentRule('');setProposedRule('');setRationale('');
      const refresh=await fetch('/api/governance/amendments',{cache:'no-store'});
      const refreshed=await refresh.json().catch(()=>({})) as {corrections?:RoleCorrection[];amendments?:RoleAmendment[]};
      if(refresh.ok){
        setCorrections(Array.isArray(refreshed.corrections)?refreshed.corrections.filter(item=>item.documentRef===documentRef):[]);
        setAmendments(Array.isArray(refreshed.amendments)?refreshed.amendments.filter(item=>item.documentRef===documentRef):[]);
      }
    }catch{
      setFeedback('تعذر حفظ التعديل الآن.');
    }finally{
      setPending(false);
    }
  }

  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label={'تفاصيل '+role.name}>
    <aside className={`${styles.mobileSheet} ${styles.algorithmRoleSheet} ${styles.mobileFullPageSheet}`}>
      <div className={styles.sheetHeader}><strong>الوصف الوظيفي الحاكم</strong><button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>
      <div className={styles.algorithmRoleContent}>
        <section className={styles.algorithmRoleHero}>
          <div><strong>{editText(role.name)}</strong><small>يتبع إلى {editText(role.reportsTo)}</small></div>
          {roleAvatar[role.key]
            ?<span className={styles.algorithmRolePortrait}><Image className={styles.algorithmRolePortraitImage} src={roleAvatar[role.key]!} alt={role.name} width={288} height={288} unoptimized/></span>
            :<LucideIcon name={role.kind==='advisor'?'sparkles':'circleUserRound'} size={24}/>}
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة 1</small><strong>الغرض من الدور والمهمة الأساسية</strong></header>
          <div className={styles.algorithmRoleItem}><span>1.1</span><p>{editText(role.mandate)}</p></div>
        </section>

        <section className={styles.governedQuickActions+' '+styles.algorithmRoleEditActions} aria-label="تعديل الوصف الوظيفي">
          <button type="button" className={styles.governedTypoButton} onClick={()=>{setEditMode('typo');setFeedback('')}}><LucideIcon name="pencil" size={24}/><span><strong>تعديل إملائي</strong></span></button>
          <button type="button" className={styles.governedGovernanceButton} onClick={()=>{setEditMode('governance');setFeedback('')}}><LucideIcon name="landmark" size={24}/><span><strong>طلب تعديل</strong></span></button>
        </section>

        {editMode&&<div className={styles.governedEditModal} role="dialog" aria-modal="true" aria-label={editMode==='typo'?'تعديل إملائي':'طلب تعديل'}>
          <button type="button" className={styles.governedEditModalScrim} aria-label="إغلاق" onClick={()=>setEditMode(null)}/>
          <form className={styles.governedAmendmentForm+' '+styles.governedEditModalCard} onSubmit={submitEdit}>
            <header className={styles.governedEditFormHeader}><span className={styles.governedEditFormIcon}><LucideIcon name={editMode==='typo'?'pencil':'landmark'} size={20}/></span><div><strong>{editMode==='typo'?'تعديل إملائي':'طلب تعديل'}</strong><small>{editMode==='typo'?'لتصحيح خطأ إملائي أو صياغي دون تغيير المسؤولية أو الصلاحية.':'لتغيير المضمون أو التفويض أو المسؤوليات عبر مسار الاعتماد.'}</small></div><button type="button" className={styles.governedEditClose} onClick={()=>setEditMode(null)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></header>
            <label><span>رقم المادة أو البند</span><input value={clauseRef} onChange={event=>updateClauseReference(event.target.value)} placeholder="مثال: 2.3"/></label>
            <label><span>النص الحالي</span><textarea required value={currentRule} onChange={event=>setCurrentRule(event.target.value)} placeholder="يظهر تلقائيًا عند إدخال رقم المادة أو البند"/></label>
            <label><span>{editMode==='typo'?'النص المصحح':'التعديل المقترح'}</span><textarea required value={proposedRule} onChange={event=>setProposedRule(event.target.value)} placeholder="اكتب النص المقترح"/></label>
            <label><span>سبب التعديل</span><textarea required value={rationale} onChange={event=>setRationale(event.target.value)} placeholder="وضح سبب التعديل باختصار"/></label>
            {editMode==='governance'&&<label><span>الأولوية</span><select value={priority} onChange={event=>setPriority(event.target.value as typeof priority)}><option value="NORMAL">عادي</option><option value="NEXT_MEETING">للاجتماع القادم</option><option value="URGENT">عاجل</option></select></label>}
            <p>{editMode==='typo'?'يظهر التصحيح مباشرة ويسجل في سجل التعديلات دون إنشاء قرار حوكمي.':'لن يتغير الوصف النافذ حتى الاعتماد وتاريخ النفاذ.'}</p>
            <div className={styles.governedAmendmentActions}><button type="button" onClick={()=>setEditMode(null)}>إلغاء</button><button type="submit" disabled={pending}>{pending?'جارٍ الحفظ…':editMode==='typo'?'حفظ التصحيح':'إرسال للاعتماد'}</button></div>
          </form>
        </div>}

        {feedback&&<p className={styles.governedDocumentFeedback}>{feedback}</p>}
        {sections.map((section,index)=><RoleSection key={section.title} number={index+2} title={section.title} items={section.items}/>)}
      </div>
    </aside>
  </div>;
}
