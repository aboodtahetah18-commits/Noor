'use client';

import { useEffect, useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { Button, Input, Select, Textarea } from '@/components/ui';
import type { ExtendedProfileSection } from '@/lib/conversations/extended-profile-catalog';
import styles from './conversation-workspace.module.css';

type FactEnvelope={value?:Record<string,unknown>;confidence?:number;verified_at?:string|null;updated_at?:string|null};

export function ExtendedProfileSheet({
  open,
  onClose,
}:{
  open:boolean;
  onClose:()=>void;
}){
  const [sections,setSections]=useState<ExtendedProfileSection[]>([]);
  const [facts,setFacts]=useState<Record<string,FactEnvelope>>({});
  const [activeKey,setActiveKey]=useState('');
  const [values,setValues]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const active=useMemo(()=>sections.find(section=>section.key===activeKey)??null,[sections,activeKey]);

  useEffect(()=>{
    if(!open) return;
    let cancelled=false;
    queueMicrotask(()=>{if(!cancelled){setLoading(true);setError('')}});
    fetch('/api/onboarding/extended-profile',{cache:'no-store'})
      .then(async response=>{
        const data=await response.json() as {sections?:ExtendedProfileSection[];facts?:Record<string,FactEnvelope>;code?:string};
        if(!response.ok) throw new Error(data.code??'EXTENDED_PROFILE_UNAVAILABLE');
        if(cancelled) return;
        const nextSections=Array.isArray(data.sections)?data.sections:[];
        setSections(nextSections);
        setFacts(data.facts&&typeof data.facts==='object'?data.facts:{});
        setActiveKey(current=>current||nextSections[0]?.key||'');
      })
      .catch(()=>{if(!cancelled)setError('تعذر تحميل الملف المالي التفصيلي الآن.')})
      .finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[open]);

  useEffect(()=>{
    if(!active) return;
    const source=facts[active.key]?.value??{};
    const next:Record<string,string>={};
    for(const field of active.fields){
      const value=source[field.key];
      next[field.key]=value===null||value===undefined?'':String(value);
    }
    queueMicrotask(()=>setValues(next));
  },[active,facts]);

  if(!open) return null;

  async function save(){
    if(!active||saving) return;
    setSaving(true);setError('');
    try{
      const payload:Record<string,unknown>={};
      for(const field of active.fields){
        const raw=(values[field.key]??'').trim();
        if(!raw) continue;
        if(field.kind==='number'){
          const n=Number(raw);
          if(Number.isFinite(n)&&n>=0) payload[field.key]=n;
        }else payload[field.key]=raw;
      }
      const response=await fetch('/api/onboarding/extended-profile',{
        method:'PUT',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({section:active.key,values:payload}),
      });
      const data=await response.json() as {ok?:boolean;section?:string;value?:Record<string,unknown>};
      if(!response.ok||!data.ok) throw new Error('save');
      setFacts(current=>({...current,[active.key]:{value:data.value??payload,confidence:1,verified_at:new Date().toISOString(),updated_at:new Date().toISOString()}}));
    }catch{
      setError('تعذر حفظ هذه المجموعة. لم يعتمد نماء التعديل.');
    }finally{
      setSaving(false);
    }
  }

  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="الملف المالي التفصيلي">
    <button type="button" className={styles.scrim} aria-label="إغلاق" onClick={onClose}/>
    <aside className={styles.mobileSheet+' '+styles.extendedProfileSheet+' ux-dialog-surface'}>
      <div className={styles.sheetHeader}>
        <strong>الملف المالي التفصيلي</strong>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></Button>
      </div>
      <div className={styles.extendedProfileIntro}>
        <LucideIcon name="listChecks" size={24}/>
        <div><strong>تعلم ممتد بدون استبيان ثقيل</strong><small>املأ ما ينطبق عليك فقط. الحقائق الموجودة يعاد استخدامها، وهذه التفاصيل لا تمنع فتح المنصة إذا لم تكن جوهرية الآن.</small></div>
      </div>
      {loading&&<p className={styles.sheetMessage}>جارٍ تحميل الأقسام…</p>}
      {error&&<p className={styles.intakeError}>{error}</p>}
      {!loading&&<div className={styles.extendedProfileLayout}>
        <nav className={styles.extendedSectionTabs} aria-label="أقسام الملف">
          {sections.map(section=><button key={section.key} type="button" className={activeKey===section.key?styles.extendedTabActive:''} onClick={()=>setActiveKey(section.key)}>
            <strong>{section.title}</strong>
            <small>{facts[section.key]?.verified_at?'محفوظ':'اختياري'}</small>
          </button>)}
        </nav>
        {active&&<section className={styles.extendedEditor}>
          <header><strong>{active.title}</strong><small>{active.summary}</small></header>
          <div className={styles.intakeGrid}>
            {active.fields.map(field=><label key={field.key} className={field.kind==='textarea'?styles.intakeWide:undefined}>
              <span>{field.label}</span>
              {field.kind==='select'
                ? <Select value={values[field.key]??''} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}>
                    <option value="">اختر</option>{field.options?.map(option=><option key={option}>{option}</option>)}
                  </Select>
                : field.kind==='textarea'
                  ? <Textarea rows={3} placeholder={field.placeholder} value={values[field.key]??''} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}/>
                  : <Input type={field.kind==='number'?'number':field.kind==='date'?'date':'text'} min={field.kind==='number'?'0':undefined} inputMode={field.kind==='number'?'decimal':undefined} placeholder={field.placeholder} value={values[field.key]??''} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}/>
              }
            </label>)}
          </div>
          <div className={styles.extendedActions}>
            <small>الحفظ يحدّث الحقيقة المرجعية لهذا القسم؛ لا ينشئ عملية مالية أو تنفيذًا خارجيًا.</small>
            <Button type="button" variant="primary" disabled={saving} onClick={()=>void save()}>
              <LucideIcon name="save" size={20}/><span>{saving?'جارٍ الحفظ…':'حفظ القسم'}</span>
            </Button>
          </div>
        </section>}
      </div>}
    </aside>
  </div>;
}
