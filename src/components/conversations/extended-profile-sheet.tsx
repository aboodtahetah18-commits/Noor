'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import type { ExtendedProfileSection } from '@/lib/conversations/extended-profile-catalog';
import styles from './conversation-workspace.module.css';

type FactEnvelope={value?:Record<string,unknown>;confidence?:number;verified_at?:string|null;updated_at?:string|null};
type TableRow=Record<string,string>;

function tableRowsFromFact(section:ExtendedProfileSection|null,fact?:FactEnvelope){
  if(!section?.table) return [] as TableRow[];
  const items=fact?.value?.items;
  if(!Array.isArray(items)) return [] as TableRow[];
  return items.flatMap(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item)) return [];
    const source=item as Record<string,unknown>;
    const row:TableRow={};
    for(const column of section.table?.columns??[]){
      const value=source[column.key];
      row[column.key]=value===null||value===undefined?'':String(value);
    }
    return [row];
  });
}

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
  const [tableRows,setTableRows]=useState<TableRow[]>([]);
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
    if(active.table){
      queueMicrotask(()=>setTableRows(tableRowsFromFact(active,facts[active.key])));
      return;
    }
    const source=facts[active.key]?.value??{};
    const next:Record<string,string>={};
    for(const field of active.fields){
      const value=source[field.key];
      next[field.key]=value===null||value===undefined?'':String(value);
    }
    queueMicrotask(()=>setValues(next));
  },[active,facts]);

  if(!open) return null;

  function addTableRow(){
    if(!active?.table) return;
    const row:TableRow={};
    for(const column of active.table.columns) row[column.key]='';
    setTableRows(current=>[...current,row]);
  }

  function updateTableCell(index:number,key:string,value:string){
    setTableRows(current=>current.map((row,rowIndex)=>rowIndex===index?{...row,[key]:value}:row));
  }

  function removeTableRow(index:number){
    setTableRows(current=>current.filter((_,rowIndex)=>rowIndex!==index));
  }

  async function save(){
    if(!active||saving) return;
    setSaving(true);setError('');
    try{
      const payload:Record<string,unknown>={};
      if(active.table){
        payload.items=tableRows.map(row=>{
          const item:Record<string,unknown>={};
          for(const column of active.table?.columns??[]){
            const raw=(row[column.key]??'').trim();
            if(!raw) continue;
            if(column.kind==='number'){
              const n=Number(raw);
              if(Number.isFinite(n)&&n>=0) item[column.key]=n;
            }else item[column.key]=raw;
          }
          return item;
        }).filter(item=>Object.keys(item).length>0);
      }else{
        for(const field of active.fields){
          const raw=(values[field.key]??'').trim();
          if(!raw) continue;
          if(field.kind==='number'){
            const n=Number(raw);
            if(Number.isFinite(n)&&n>=0) payload[field.key]=n;
          }else payload[field.key]=raw;
        }
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
    <aside className={styles.mobileSheet+' '+styles.mobileFullPageSheet+' '+styles.extendedProfileSheet}>
      <div className={styles.sheetHeader+' '+styles.extendedProfileHeader}>
        <div className={styles.extendedProfileHeaderTitle}>
          <Image className={styles.extendedProfileLogo} src="/brand/ndos/namaa-logo-color-hq.png" alt="نماء" width={96} height={38} priority/>
          <strong>الملف المالي التفصيلي</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button>
      </div>
      {loading&&<p className={styles.sheetMessage}>جارٍ تحميل الأقسام…</p>}
      {error&&<p className={styles.intakeError}>{error}</p>}
      {!loading&&<div className={styles.extendedProfileLayout}>
        <nav className={styles.extendedSectionTabs} aria-label="أقسام الملف">
          {sections.map(section=><button key={section.key} type="button" className={activeKey===section.key?styles.extendedTabActive:''} onClick={()=>setActiveKey(section.key)}>
            <strong>{section.title}</strong>
          </button>)}
        </nav>
        {active&&<section className={styles.extendedEditor}>
          <header><strong>{active.title}</strong><small>{active.summary}</small></header>

          {active.table
            ? <div className={styles.extendedTableSection}>
                <div className={styles.extendedTableToolbar}>
                  <span>{tableRows.length?tableRows.length+' عناصر مسجلة':'لا توجد عناصر مسجلة'}</span>
                  <button type="button" onClick={addTableRow}><LucideIcon name="plus" size={16}/><span>{active.table.addLabel}</span></button>
                </div>
                {tableRows.length===0
                  ? <div className={styles.extendedTableEmpty}><LucideIcon name="receiptText" size={24}/><span>{active.table.emptyLabel}</span></div>
                  : <div className={styles.extendedDataTableWrap}>
                      <table className={styles.extendedDataTable}>
                        <thead><tr>{active.table.columns.map(column=><th key={column.key}>{column.label}</th>)}<th aria-label="إجراءات"/></tr></thead>
                        <tbody>{tableRows.map((row,rowIndex)=><tr key={rowIndex}>
                          {active.table?.columns.map(column=><td key={column.key} data-label={column.label}>
                            {column.kind==='select'
                              ? <select value={row[column.key]??''} onChange={event=>updateTableCell(rowIndex,column.key,event.target.value)}>
                                  <option value="">اختر</option>
                                  {column.options?.map(option=><option key={option} value={option}>{option}</option>)}
                                </select>
                              : <input
                                  type={column.kind==='number'?'number':'text'}
                                  min={column.kind==='number'?'0':undefined}
                                  inputMode={column.kind==='number'?'decimal':undefined}
                                  value={row[column.key]??''}
                                  onChange={event=>updateTableCell(rowIndex,column.key,event.target.value)}
                                />}
                          </td>)}
                          <td className={styles.extendedRowActions}><button type="button" onClick={()=>removeTableRow(rowIndex)} aria-label="حذف السطر"><LucideIcon name="trash2" size={16}/></button></td>
                        </tr>)}</tbody>
                      </table>
                    </div>}
              </div>
            : <div className={styles.intakeGrid}>
                {active.fields.map(field=><label key={field.key} className={field.kind==='textarea'?styles.intakeWide:undefined}>
                  <span>{field.label}</span>
                  {field.kind==='select'
                    ? <select value={values[field.key]??''} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}>
                        <option value="">اختر</option>{field.options?.map(option=><option key={option}>{option}</option>)}
                      </select>
                    : field.kind==='textarea'
                      ? <textarea rows={3} placeholder={field.placeholder} value={values[field.key]??''} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}/>
                      : <input type={field.kind==='number'?'number':field.kind==='date'?'date':'text'} min={field.kind==='number'?'0':undefined} inputMode={field.kind==='number'?'decimal':undefined} placeholder={field.placeholder} value={values[field.key]??''} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}/>
                  }
                </label>)}
              </div>}

          <div className={styles.extendedActions}>
            <button type="button" className={styles.primaryActionButton} disabled={saving} onClick={()=>void save()}>
              <LucideIcon name="save" size={20}/><span>{saving?'جارٍ الحفظ…':'حفظ'}</span>
            </button>
          </div>
        </section>}
      </div>}
    </aside>
  </div>;
}
