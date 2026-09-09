'use client';

import { useEffect, useRef, useState } from 'react';
import { analyzeDailyBankMessageAction } from '@/app/(protected)/bank-operations/actions';
import { ActionIcon } from '@/components/ui/action-icon';

type AccountOption={id:string;name:string;bankName?:string|null;isActive?:boolean};
const EVENT='pfa:open-bank-message';

export function openBankMessageDialog(){window.dispatchEvent(new CustomEvent(EVENT));}

export function BankMessageDialogTrigger({className,children,ariaLabel='إضافة رسالة بنكية',title='إضافة رسالة بنكية',onBeforeOpen}:{className?:string;children:React.ReactNode;ariaLabel?:string;title?:string;onBeforeOpen?:()=>void}){
  return <button type="button" className={className} aria-haspopup="dialog" aria-label={ariaLabel} title={title} onClick={()=>{onBeforeOpen?.();openBankMessageDialog();}}>{children}</button>;
}

export function BankMessageDialog(){
  const ref=useRef<HTMLDialogElement>(null);
  const [open,setOpen]=useState(false);
  const [accounts,setAccounts]=useState<AccountOption[] | null>(null);
  const loadedRef=useRef(false);

  useEffect(()=>{const h=()=>setOpen(true);window.addEventListener(EVENT,h);return()=>window.removeEventListener(EVENT,h)},[]);
  useEffect(()=>{const d=ref.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close()},[open]);
  useEffect(()=>{
    if(!open||loadedRef.current)return;
    const controller=new AbortController();
    fetch('/api/accounts/options',{signal:controller.signal,headers:{accept:'application/json'}})
      .then(r=>r.ok?r.json():Promise.reject(new Error('accounts-load-failed')))
      .then((payload:{accounts?:AccountOption[]})=>{setAccounts(payload.accounts??[]);loadedRef.current=true;})
      .catch(()=>{});
    return()=>controller.abort();
  },[open]);
  const close=()=>setOpen(false);
  return <dialog ref={ref} className="p49-action-dialog is-lg bank-message-global-dialog" aria-modal="true" aria-labelledby="bank-message-dialog-title" onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===ref.current)close()}}>
    <div className="p49-dialog-shell" dir="rtl">
      <header className="p49-dialog-header"><div className="p49-dialog-title-block"><span className="p49-dialog-title-icon"><ActionIcon name="bankMessage"/></span><div><h2 id="bank-message-dialog-title">إضافة رسالة بنكية</h2></div></div><button type="button" className="p49-dialog-close" onClick={close} aria-label="إغلاق النافذة"><ActionIcon name="close"/></button></header>
      <div className="p49-dialog-body"><form action={analyzeDailyBankMessageAction} className="bank-message-dialog-form"><label><span>الحساب <small>اختياري</small></span><select name="accountId" defaultValue="" disabled={accounts===null}><option value="">{accounts===null?'جاري تحميل الحسابات…':'تعرّف تلقائيًا'}</option>{(accounts??[]).filter(a=>a.isActive!==false).map(a=><option key={a.id} value={a.id}>{a.bankName?`${a.bankName} · `:''}{a.name}</option>)}</select></label><label><span>نص الرسالة</span><textarea name="message" rows={7} maxLength={4000} placeholder="ألصق رسالة البنك هنا…" required autoFocus/></label><div className="button-row"><button className="primary-button" type="submit">تحليل ومراجعة</button><button className="secondary-button" type="button" onClick={close}>إلغاء</button></div></form></div>
    </div>
  </dialog>;
}
