'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import type { ExtendedProfileSection, ExtendedProfileTableColumn } from '@/lib/conversations/extended-profile-catalog';
import { fuelMonthlyCost, maintenanceForecast, monthlyRecurringTotal } from '@/lib/financial-form-calculations';
import styles from './conversation-workspace.module.css';

type FactEnvelope={value?:Record<string,unknown>;confidence?:number;verified_at?:string|null;updated_at?:string|null};
type TableRow=Record<string,string>;

function tableRowsFromFact(section:ExtendedProfileSection|null,fact?:FactEnvelope){
  if(!section?.table) return [] as TableRow[];
  const value=fact?.value??{};
  const items=value.items;
  if(Array.isArray(items)){
    return items.flatMap(item=>{
      if(!item||typeof item!=='object'||Array.isArray(item)) return [];
      const source=item as Record<string,unknown>;
      const row:TableRow={};
      for(const column of section.table?.columns??[]){
        let cell=source[column.key]??(column.key==='due_day'?source.due_note:undefined);
        if(section.key==='budget_behavior'){
          if(column.key==='frequency_period'&&!cell&&typeof source.frequency==='string'){
            const raw=String(source.frequency);
            cell=/يومي/.test(raw)?'يومي':/أسبوع/.test(raw)?'أسبوعي':/شهر/.test(raw)?'شهري':'';
          }
          if(column.key==='occurrences'&&!cell&&typeof source.frequency==='string'){
            cell=String(source.frequency).match(/\d+(?:\.\d+)?/)?.[0]??'';
          }
          if(column.key==='unit_cost'&&!cell) cell=source.average_amount;
          if(column.key==='monthly_total'&&!cell) cell=source.monthly_limit;
        }
        if(section.key==='vehicle_maintenance'){
          if(column.key==='category'&&!cell) cell=source.name??'أخرى';
          if(column.key==='primary_amount'&&!cell) cell=source.amount;
          if(column.key==='schedule_pattern'&&!cell) cell='ثابت';
          if(column.key==='interval_unit'&&!cell&&typeof source.recurrence==='string') cell=/كيلو/.test(String(source.recurrence))?'ألف كم':'شهر';
          if(column.key==='interval_value'&&!cell&&typeof source.recurrence==='string') cell=String(source.recurrence).match(/\d+/)?.[0]??'';
        }
        if(section.key==='vehicle_expenses'&&column.key==='category'&&!cell) cell=source.name??'أخرى';
        if(section.key==='vehicle_details'){
          if(column.key==='vehicle_name'&&!cell) cell=source.vehicle_model??source.model??source.name;
          if(column.key==='fuel_efficiency'&&!cell&&typeof source.efficiency_notes==='string'){
            cell=String(source.efficiency_notes).match(/\d+(?:\.\d+)?/)?.[0]??'';
          }
        }
        row[column.key]=cell===null||cell===undefined?'':String(cell);
      }
      if(section.table?.allowCustomCategory&&row.category&&row.category!=='أخرى'&&!section.table.categoryOptions?.includes(row.category)){
        row.custom_category=row.custom_category||row.category;
        row.category='أخرى';
      }
      return [row];
    });
  }

  const text=(key:string)=>typeof value[key]==='string'?String(value[key]).trim():'';
  if(section.key==='vehicle_details'&&Object.keys(value).length){
    const row:TableRow={
      vehicle_name:text('vehicle_name')||text('vehicle_model')||text('model'),
      vehicle_make:text('vehicle_make'),
      vehicle_year:value.vehicle_year===undefined?'':String(value.vehicle_year),
      ownership:text('ownership'),
      monthly_distance:value.monthly_distance===undefined?'':String(value.monthly_distance),
      fuel_type:text('fuel_type'),
      fuel_efficiency:text('fuel_efficiency')||text('efficiency_notes').match(/\d+(?:\.\d+)?/)?.[0]||'',
      fuel_price:value.fuel_price===undefined?'':String(value.fuel_price),
      estimated_fuel_cost:value.estimated_fuel_cost===undefined?'':String(value.estimated_fuel_cost),
      notes:text('notes')||text('maintenance_notes'),
    };
    return Object.values(row).some(Boolean)?[row]:[];
  }
  if(section.key==='housing_details'&&Object.keys(value).length){
    const amount=value.monthly_housing_cost===undefined?'':String(value.monthly_housing_cost);
    const housingType=text('housing_type');
    const notes=text('maintenance_notes');
    const rows:TableRow[]=[];
    if(housingType||amount) rows.push({category:housingType==='إيجار'?'إيجار':'سكن',name:housingType||'السكن',amount,recurrence:'شهري'});
    if(notes) rows.push({category:'صيانة',name:'صيانة أو إصلاح معروف',notes});
    return rows;
  }
  if(section.key==='travel_profile'&&Object.keys(value).length){
    const row:TableRow={
      trip_purpose:text('trip_purpose'),destination:text('destination'),start_date:text('start_date'),end_date:text('end_date'),
      travelers:value.travelers===undefined?'':String(value.travelers),transport:text('transport'),budget:'',currency:text('currency'),
      notes:[text('lodging_notes'),text('budget_notes')].filter(Boolean).join(' — '),
    };
    return Object.values(row).some(Boolean)?[row]:[];
  }
  if(section.key==='assets_investments'&&Object.keys(value).length){
    const legacy:TableRow={
      category:text('asset_type')||'أخرى',
      custom_category:'',
      name:text('asset_type'),
      ownership_share:text('ownership_share'),
      current_value:value.current_value===undefined?'':String(value.current_value),
      valuation_date:text('valuation_date'),
      liquidity_notes:text('liquidity_notes'),
      goal_link:text('goal_link'),
      risk_notes:text('risk_notes'),
    };
    if(legacy.category&&!section.table.categoryOptions?.includes(legacy.category)){
      legacy.custom_category=legacy.category;
      legacy.category='أخرى';
    }
    return Object.values(legacy).some(Boolean)?[legacy]:[];
  }
  if(section.key==='renewals_insurance'){
    const rows:TableRow[]=[];
    if(text('renewals')) rows.push({category:'تجديد حكومي',name:text('renewals'),due_date:text('renewal_dates'),notes:''});
    if(text('insurance_policies')) rows.push({category:'وثيقة أخرى',name:text('insurance_policies'),due_date:text('renewal_dates'),notes:''});
    if(text('claims_notes')) rows.push({category:'مطالبة تأمينية',name:'مطالبة أو تحمل قائم',notes:text('claims_notes')});
    return rows;
  }
  if(section.key==='routine_events'){
    const rows:TableRow[]=[];
    if(text('routine_places')) rows.push({category:'مكان متكرر',name:text('routine_places')});
    if(text('routine_times')) rows.push({category:'وقت متكرر',name:text('routine_times')});
    if(text('recurring_events')) rows.push({category:'مناسبة',name:text('recurring_events')});
    if(text('change_notes')) rows.push({category:'تغير في الروتين',name:text('change_notes')});
    return rows;
  }
  return [];
}

function rowLabel(section:ExtendedProfileSection,row:TableRow){
  if(section.table?.allowCustomCategory&&row.category==='أخرى') return row.custom_category||row.name||'عنصر جديد';
  return row.vehicle_name||row.name||row.category||row.beneficiary||'العنصر';
}

function displayCell(section:ExtendedProfileSection,row:TableRow,column:ExtendedProfileTableColumn){
  if(section.table?.allowCustomCategory&&column.key==='category'&&row.category==='أخرى'&&row.custom_category) return row.custom_category;
  return row[column.key]||'—';
}

function stockField(key:string){
  return ['share_count','share_cost','total_cost','market_price','market_value'].includes(key);
}

export function ExtendedProfileSheet({
  open,
  onClose,
  initialSection,
}:{
  open:boolean;
  onClose:()=>void;
  initialSection?:string|null;
}){
  const [sections,setSections]=useState<ExtendedProfileSection[]>([]);
  const [facts,setFacts]=useState<Record<string,FactEnvelope>>({});
  const [activeKey,setActiveKey]=useState('');
  const [values,setValues]=useState<Record<string,string>>({});
  const [tableRows,setTableRows]=useState<TableRow[]>([]);
  const [draftRow,setDraftRow]=useState<TableRow|null>(null);
  const [draftIndex,setDraftIndex]=useState<number|null>(null);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const visibleSections=useMemo(
    ()=>sections.filter(section=>!section.managedElsewhere&&(!section.hiddenByDefault||Boolean(facts[section.key]))),
    [sections,facts],
  );
  const active=useMemo(()=>visibleSections.find(section=>section.key===activeKey)??null,[visibleSections,activeKey]);

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
        const nextFacts=data.facts&&typeof data.facts==='object'?data.facts:{};
        const available=nextSections.filter(section=>!section.managedElsewhere&&(!section.hiddenByDefault||Boolean(nextFacts[section.key])));
        setSections(nextSections);
        setFacts(nextFacts);
        const preferred=initialSection&&available.some(section=>section.key===initialSection)?initialSection:null;
        setActiveKey(preferred??available[0]?.key??'');
      })
      .catch(()=>{if(!cancelled)setError('تعذر تحميل الملف المالي التفصيلي الآن.')})
      .finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[open,initialSection]);

  useEffect(()=>{
    if(!active) return;
    queueMicrotask(()=>{setDraftRow(null);setDraftIndex(null)});
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

  function blankRow(section:ExtendedProfileSection){
    const row:TableRow={};
    for(const column of section.table?.columns??[]) row[column.key]='';
    if(section.table?.columns.some(column=>column.key==='recurrence')) row.recurrence='شهري';
    if(section.key==='vehicle_maintenance') row.schedule_pattern='ثابت';
    if(section.key==='budget_behavior'){ row.frequency_period='شهري'; row.context='عام'; }
    return row;
  }

  function openAddModal(){
    if(!active?.table) return;
    setError('');
    setDraftIndex(null);
    setDraftRow(blankRow(active));
  }

  function openEditModal(index:number){
    if(!active?.table) return;
    setError('');
    setDraftIndex(index);
    setDraftRow({...tableRows[index]});
  }

  function serializeRows(section:ExtendedProfileSection,rows:TableRow[]){
    return rows.map(row=>{
      const item:Record<string,unknown>={};
      for(const column of section.table?.columns??[]){
        const raw=(row[column.key]??'').trim();
        if(!raw) continue;
        if(column.kind==='number'){
          const n=Number(raw);
          if(Number.isFinite(n)&&n>=0) item[column.key]=n;
        }else item[column.key]=raw;
      }
      return item;
    }).filter(item=>Object.keys(item).length>0);
  }

  async function persist(section:ExtendedProfileSection,rows=tableRows,nextValues=values){
    const payload:Record<string,unknown>={};
    if(section.table){
      payload.items=serializeRows(section,rows);
    }else{
      for(const field of section.fields){
        const raw=(nextValues[field.key]??'').trim();
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
      body:JSON.stringify({section:section.key,values:payload}),
    });
    const data=await response.json() as {ok?:boolean;value?:Record<string,unknown>};
    if(!response.ok||!data.ok) throw new Error('save');
    setFacts(current=>({...current,[section.key]:{value:data.value??payload,confidence:1,verified_at:new Date().toISOString(),updated_at:new Date().toISOString()}}));
  }

  function validateDraft(){
    if(!active?.table||!draftRow) return false;
    const first=active.table.columns.find(column=>column.key!=='custom_category');
    if(first&&!(draftRow[first.key]??'').trim()){
      setError('أكمل الحقل الأساسي قبل الإضافة.');
      return false;
    }
    if(active.table.allowCustomCategory&&draftRow.category==='أخرى'&&!(draftRow.custom_category??'').trim()){
      setError('اكتب اسم النوع الجديد.');
      return false;
    }
    for(const column of active.table.columns){
      const raw=(draftRow[column.key]??'').trim();
      if(!raw||column.kind!=='number') continue;
      const n=Number(raw);
      if(!Number.isFinite(n)||n<0){
        setError('تحقق من القيم الرقمية المدخلة.');
        return false;
      }
      if(column.key==='due_day'&&(!Number.isInteger(n)||n<1||n>31)){
        setError('يوم الاستحقاق يجب أن يكون من 1 إلى 31.');
        return false;
      }
    }
    return true;
  }

  function updateDraftValue(key:string,value:string){
    setDraftRow(current=>{
      if(!current) return current;
      const next={...current,[key]:value};
      if(active?.key==='budget_behavior'){
        const period=(next.frequency_period||'شهري') as 'يومي'|'أسبوعي'|'شهري';
        const context=(next.context||'عام') as 'عام'|'أيام العمل'|'نهاية الأسبوع';
        next.monthly_total=String(monthlyRecurringTotal(period,Number(next.occurrences||0),Number(next.unit_cost||0),context));
      }
      if(active?.key==='vehicle_details'){
        next.estimated_fuel_cost=String(fuelMonthlyCost(
          Number(next.monthly_distance||0),
          Number(next.fuel_efficiency||0),
          Number(next.fuel_price||0),
        ));
      }
      if(active?.key==='vehicle_maintenance'){
        if(key==='schedule_pattern'&&value!=='متناوب'){
          next.alternate_name='';
          next.alternate_amount='';
        }
        const forecast=maintenanceForecast({
          intervalValue:Number(next.interval_value||0),
          forecastValue:Number(next.forecast_value||0),
          primaryAmount:Number(next.primary_amount||0),
          alternateAmount:Number(next.alternate_amount||0),
          alternating:next.schedule_pattern==='متناوب',
        });
        next.forecast_occurrences=String(forecast.occurrences);
        next.forecast_total=String(forecast.total);
      }
      return next;
    });
  }

  async function commitDraftRow(){
    if(!active?.table||!draftRow||saving||!validateDraft()) return;
    const nextRows=draftIndex===null
      ? [...tableRows,{...draftRow}]
      : tableRows.map((row,index)=>index===draftIndex?{...draftRow}:row);
    setSaving(true);setError('');
    try{
      await persist(active,nextRows);
      setTableRows(nextRows);
      setDraftRow(null);setDraftIndex(null);
    }catch{
      setError('تعذر حفظ العنصر. لم يعتمد نماء التعديل.');
    }finally{
      setSaving(false);
    }
  }

  async function removeTableRow(index:number){
    if(!active?.table||saving) return;
    const nextRows=tableRows.filter((_,rowIndex)=>rowIndex!==index);
    setSaving(true);setError('');
    try{
      await persist(active,nextRows);
      setTableRows(nextRows);
    }catch{
      setError('تعذر حذف العنصر الآن.');
    }finally{
      setSaving(false);
    }
  }

  async function saveAndAdvance(){
    if(!active||saving) return;
    setSaving(true);setError('');
    try{
      await persist(active);
      const index=visibleSections.findIndex(section=>section.key===active.key);
      const next=visibleSections[index+1];
      if(next) setActiveKey(next.key);
    }catch{
      setError('تعذر حفظ هذه المجموعة. لم يعتمد نماء التعديل.');
    }finally{
      setSaving(false);
    }
  }

  const activeIndex=active?visibleSections.findIndex(section=>section.key===active.key):-1;
  const isLast=activeIndex===visibleSections.length-1;
  const displayColumns=active?.table?.columns.filter(column=>column.key!=='custom_category')??[];
  const categoryOptions=active?.table?.categoryOptions??[];
  const vehicleRows=tableRowsFromFact(sections.find(section=>section.key==='vehicle_details')??null,facts.vehicle_details);
  const beneficiaryRows=tableRowsFromFact(sections.find(section=>section.key==='beneficiaries')??null,facts.beneficiaries);
  const beneficiaryOptions=[...new Set(beneficiaryRows.map(row=>row.name).filter(Boolean))];
  const vehicleOptions=vehicleRows.map(row=>row.vehicle_name).filter(Boolean);
  const selectedVehicle=draftRow?.vehicle?vehicleRows.find(row=>row.vehicle_name===draftRow.vehicle):null;


  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="الملف المالي التفصيلي">
    <button type="button" className={styles.scrim} aria-label="إغلاق" onClick={onClose}/>
    <aside className={styles.mobileSheet+' '+styles.mobileFullPageSheet+' '+styles.extendedProfileSheet}>
      <div className={styles.sheetHeader+' '+styles.extendedProfileHeader}>
        <div className={styles.extendedProfileHeaderTitle}>
          <span className={styles.extendedProfileBrand} aria-label="نماء"><b>نماء</b><Image src="/brand/namaa-leaf.webp" alt="" width={38} height={38} priority/></span>
          <strong>الملف المالي التفصيلي</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button>
      </div>

      {loading&&<p className={styles.sheetMessage}>جارٍ تحميل الأقسام…</p>}
      {error&&<p className={styles.intakeError}>{error}</p>}

      {!loading&&<div className={styles.extendedProfileLayout}>
        <nav className={styles.extendedSectionTabs} aria-label="أقسام الملف">
          {visibleSections.map(section=><button key={section.key} type="button" className={activeKey===section.key?styles.extendedTabActive:''} onClick={()=>setActiveKey(section.key)}>
            <strong>{section.title}</strong>
          </button>)}
        </nav>

        {active&&<section className={styles.extendedEditor}>
          <header><strong>{active.title}</strong><small>{active.summary}</small></header>

          {active.table
            ? <div className={styles.extendedTableSection}>
                <div className={styles.extendedTableToolbar}>
                  <span>{tableRows.length?tableRows.length+' عناصر مسجلة':'لا توجد عناصر مسجلة'}</span>
                  <button type="button" onClick={openAddModal}><LucideIcon name="plus" size={16}/><span>{active.table.addLabel}</span></button>
                </div>

                {tableRows.length===0
                  ? <div className={styles.extendedTableEmpty}><LucideIcon name="receiptText" size={24}/><span>{active.table.emptyLabel}</span></div>
                  : <div className={styles.extendedDataTableWrap}>
                      <table className={styles.extendedDataTable}>
                        <thead><tr>{displayColumns.map(column=><th key={column.key} className={column.mobileVisible?styles.mobileKeepColumn:styles.mobileOptionalColumn}>{column.label}</th>)}<th>الإجراء</th></tr></thead>
                        <tbody>{tableRows.map((row,rowIndex)=><tr key={rowIndex}>
                          {displayColumns.map(column=><td key={column.key} className={column.mobileVisible?styles.mobileKeepColumn:styles.mobileOptionalColumn} data-label={column.label}>{displayCell(active,row,column)}</td>)}
                          <td className={styles.extendedRowActions}>
                            <button type="button" onClick={()=>openEditModal(rowIndex)} aria-label={'تعديل '+rowLabel(active,row)}><LucideIcon name="pencil" size={16}/></button>
                            <button type="button" onClick={()=>void removeTableRow(rowIndex)} aria-label={'حذف '+rowLabel(active,row)}><LucideIcon name="trash2" size={16}/></button>
                          </td>
                        </tr>)}</tbody>
                      </table>
                    </div>}

                {draftRow&&<div className={styles.extendedAddModalBackdrop} role="presentation">
                  <section className={styles.extendedAddModal} role="dialog" aria-modal="true" aria-label={active.table.addLabel}>
                    <header>
                      <div><strong>{draftIndex===null?active.table.addLabel:'تعديل '+rowLabel(active,draftRow)}</strong><small>أدخل البيانات الأساسية فقط، ويمكنك تعديلها لاحقًا من الجدول.</small></div>
                      <button type="button" onClick={()=>{setDraftRow(null);setDraftIndex(null)}} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button>
                    </header>
                    <div className={styles.extendedAddForm}>
                      {active.table.columns.map(column=>{
                        if(column.key==='custom_category'&&draftRow.category!=='أخرى') return null;
                        if(active.key==='assets_investments'&&stockField(column.key)&&draftRow.category!=='أسهم مباشرة') return null;
                        if(active.key==='vehicle_maintenance'&&['alternate_name','alternate_amount'].includes(column.key)&&draftRow.schedule_pattern!=='متناوب') return null;
                        const options=column.key==='vehicle'
                          ? vehicleOptions
                          : column.key==='beneficiary'
                            ? beneficiaryOptions
                            : column.key==='category'&&categoryOptions.length
                              ? categoryOptions
                              : column.options??[];
                        const readOnly=(active.key==='assets_investments'&&['total_cost','market_value'].includes(column.key))
                          ||(active.key==='budget_behavior'&&column.key==='monthly_total')
                          ||(active.key==='vehicle_details'&&column.key==='estimated_fuel_cost')
                          ||(active.key==='vehicle_maintenance'&&['forecast_occurrences','forecast_total'].includes(column.key));
                        return <label key={column.key} className={column.kind==='textarea'?styles.extendedAddWide:undefined}>
                          <span>{column.label}</span>
                          {column.kind==='select'
                            ? <select value={draftRow[column.key]??''} onChange={event=>updateDraftValue(column.key,event.target.value)}>
                                <option value="">اختر</option>
                                {options.map(option=><option key={option} value={option}>{option}</option>)}
                              </select>
                            : column.kind==='textarea'
                              ? <textarea rows={3} value={draftRow[column.key]??''} onChange={event=>updateDraftValue(column.key,event.target.value)}/>
                              : <input
                                  type={column.kind==='number'?'number':column.kind==='date'?'date':'text'}
                                  min={column.key==='due_day'?'1':column.kind==='number'?'0':undefined}
                                  max={column.key==='due_day'?'31':undefined}
                                  inputMode={column.kind==='number'?'decimal':undefined}
                                  placeholder={column.placeholder??(column.key==='due_day'?'مثال: 25':undefined)}
                                  value={draftRow[column.key]??''}
                                  readOnly={readOnly}
                                  onChange={event=>updateDraftValue(column.key,event.target.value)}
                                />}
                        </label>;
                      })}
                      {selectedVehicle&&['vehicle_maintenance','vehicle_expenses'].includes(active.key)&&<div className={styles.linkedRecordPreview}>
                        <strong>بيانات المركبة المرتبطة</strong>
                        <span>{selectedVehicle.vehicle_name}</span>
                        {selectedVehicle.vehicle_make&&<small>{selectedVehicle.vehicle_make}</small>}
                        {selectedVehicle.vehicle_year&&<small>سنة الصنع: {selectedVehicle.vehicle_year}</small>}
                        {selectedVehicle.fuel_type&&<small>الطاقة: {selectedVehicle.fuel_type}</small>}
                        {selectedVehicle.monthly_distance&&<small>المسافة الشهرية: {selectedVehicle.monthly_distance} كم</small>}
                      </div>}
                    </div>
                    <footer>
                      <button type="button" className={styles.secondaryButton} onClick={()=>{setDraftRow(null);setDraftIndex(null)}}>إلغاء</button>
                      <button type="button" className={styles.primaryActionButton} disabled={saving} onClick={()=>void commitDraftRow()}><LucideIcon name="save" size={16}/><span>{saving?'جارٍ الحفظ…':draftIndex===null?'إضافة وحفظ':'حفظ التعديل'}</span></button>
                    </footer>
                  </section>
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
            <button type="button" className={styles.primaryActionButton} disabled={saving} onClick={()=>void saveAndAdvance()}>
              <LucideIcon name={isLast?'circleCheck':'chevronLeft'} size={20}/><span>{saving?'جارٍ الحفظ…':isLast?'حفظ وتأكيد':'التالي'}</span>
            </button>
          </div>
        </section>}
      </div>}
    </aside>
  </div>;
}
