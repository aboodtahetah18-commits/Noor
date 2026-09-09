'use client';

import { useMemo, useState } from 'react';
import { Money, sumMoney } from '@/financial-engine/money';
import { formatSar } from '@/lib/format-money';
import { LucideIcon } from '@/components/ui/lucide-icon';

const GROUPS = [
  ['OBLIGATION', 'التزام'], ['ESSENTIAL', 'أساسي'], ['FLEXIBLE', 'مرن'],
  ['SAVING', 'ادخار'], ['EMERGENCY', 'طوارئ'], ['GOAL', 'هدف'],
] as const;
const RECURRENCES = [
  ['MONTHLY','كل دورة'], ['EVERY_N_CYCLES','كل عدة دورات'], ['ONE_TIME','مرة واحدة'], ['SEASONAL','موسمي'],
] as const;

type Row = { id:string; name:string; allocationType:string; plannedAmount:string; recurrenceKind:string; intervalCycles:string; startCycleDate:string; note:string };
function blank(startCycleDate:string):Row{return{id:crypto.randomUUID(),name:'',allocationType:'ESSENTIAL',plannedAmount:'',recurrenceKind:'MONTHLY',intervalCycles:'1',startCycleDate,note:''}}
function recurrenceLabel(row:Row){if(row.recurrenceKind==='MONTHLY')return 'كل دورة';if(row.recurrenceKind==='ONE_TIME')return 'مرة واحدة';if(row.recurrenceKind==='SEASONAL')return 'موسمي';return `كل ${row.intervalCycles||'2'} دورة`;}

export function ManualPlanBuilder({cycleId,startCycleDate,action}:{cycleId:string;startCycleDate:string;action:(fd:FormData)=>void|Promise<void>}){
 const [rows,setRows]=useState<Row[]>([]);const [draft,setDraft]=useState<Row>(()=>blank(startCycleDate));const [editing,setEditing]=useState<string|null>(null);const [open,setOpen]=useState(false);
 const total=useMemo(()=>sumMoney(rows.map((r)=>Money.parse(r.plannedAmount||'0.00'))),[rows]);
 function beginAdd(){setEditing(null);setDraft(blank(startCycleDate));setOpen(true)}
 function beginEdit(row:Row){setEditing(row.id);setDraft({...row});setOpen(true)}
 function save(){if(!draft.name.trim()||!draft.plannedAmount)return;setRows(cur=>editing?cur.map(r=>r.id===editing?{...draft,id:editing}:r):[...cur,draft]);setOpen(false)}
 function remove(id:string){setRows(cur=>cur.filter(r=>r.id!==id))}
 return <form action={action} className="plan-table-form">
   <input type="hidden" name="cycleId" value={cycleId}/>
   {rows.map(r=><div key={r.id} hidden>
     <input name="itemName" value={r.name} readOnly/><input name="allocationType" value={r.allocationType} readOnly/><input name="plannedAmount" value={r.plannedAmount} readOnly/>
     <input name="recurrenceKind" value={r.recurrenceKind} readOnly/><input name="intervalCycles" value={r.intervalCycles} readOnly/><input name="startCycleDate" value={r.startCycleDate} readOnly/><input name="ruleNote" value={r.note} readOnly/>
   </div>)}
   <div className="plan-table-toolbar"><button type="button" className="primary-link" onClick={beginAdd}>+ إضافة بند</button><div><span>إجمالي الخطة</span><strong dir="ltr">{formatSar(total.toString())}</strong></div></div>
   {rows.length===0?<div className="plan-empty-state">لا توجد بنود بعد. أضف أول بند لبناء خطتك.</div>:
   <div className="plan-table-wrap"><table className="plan-table"><thead><tr><th>#</th><th>البند</th><th>المجموعة</th><th>المبلغ</th><th>التكرار</th><th>الإجراءات</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.id}><td>{i+1}</td><td><strong>{r.name}</strong>{r.note?<small>{r.note}</small>:null}</td><td>{GROUPS.find(x=>x[0]===r.allocationType)?.[1]??r.allocationType}</td><td dir="ltr">{formatSar(Money.parse(r.plannedAmount||'0.00').toString())}</td><td>{recurrenceLabel(r)}</td><td><div className="table-actions"><button type="button" onClick={()=>beginEdit(r)}>تعديل</button><button type="button" className="danger-text" onClick={()=>remove(r.id)}>حذف</button></div></td></tr>)}</tbody></table></div>}
   <button className="primary-button" type="submit" disabled={rows.length===0}>حفظ مسودة الخطة</button>
   {open?<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><section className="plan-item-modal" role="dialog" aria-modal="true" aria-labelledby="plan-item-title">
     <header><h3 id="plan-item-title">{editing?'تعديل البند':'إضافة بند جديد'}</h3><button type="button" onClick={()=>setOpen(false)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></header>
     <div className="modal-form-grid">
       <label>اسم البند<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="مثال: صيانة السيارة" autoFocus/></label>
       <label>المجموعة<select value={draft.allocationType} onChange={e=>setDraft({...draft,allocationType:e.target.value})}>{GROUPS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
       <label>المبلغ<input inputMode="decimal" value={draft.plannedAmount} onChange={e=>setDraft({...draft,plannedAmount:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="0.00"/></label>
       <label>طريقة التكرار<select value={draft.recurrenceKind} onChange={e=>setDraft({...draft,recurrenceKind:e.target.value})}>{RECURRENCES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
       {draft.recurrenceKind==='EVERY_N_CYCLES'?<label>كل كم دورة؟<input type="number" min="2" max="24" value={draft.intervalCycles} onChange={e=>setDraft({...draft,intervalCycles:e.target.value})}/></label>:null}
       <label>بداية التطبيق<input type="date" value={draft.startCycleDate} onChange={e=>setDraft({...draft,startCycleDate:e.target.value})}/></label>
       <label className="full">ملاحظة اختيارية<input value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})} placeholder="مثال: تغيير الزيت كل شهرين حسب الاستخدام"/></label>
     </div>
     <footer><button type="button" className="tertiary-button" onClick={()=>setOpen(false)}>إلغاء</button><button type="button" className="primary-button" onClick={save}>حفظ البند</button></footer>
   </section></div>:null}
 </form>
}
