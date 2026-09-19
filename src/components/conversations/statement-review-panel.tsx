'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import styles from './conversation-workspace.module.css';

type ReviewAction='EXPENSE'|'INCOME'|'REFUND'|'INTERNAL_TRANSFER'|'MATCH_EXISTING'|'IGNORE';
type ReviewRow={
  id:string;
  row_number:number;
  transaction_date:string|null;
  description:string;
  amount:number|string;
  direction:'DEBIT'|'CREDIT';
  detected_kind:string;
  review_status:string;
};
type ReviewAccount={id:string;name:string;bank_name?:string|null;account_type:string};
type ReviewCategory={id:string;name:string;category_group:string;expense_nature_default?:string|null;is_essential:boolean};
type ReviewTransaction={
  id:string;
  transaction_type:string;
  status:string;
  amount:number|string;
  transaction_date:string;
  description?:string|null;
  account_id?:string|null;
};
type ReviewBundle={
  statement_import:null|{
    id:string;
    file_name:string;
    status:string;
    account_id:string;
    account_name:string;
    bank_name?:string|null;
    row_count:number;
    review_count:number;
  };
  rows:ReviewRow[];
  accounts:ReviewAccount[];
  categories:ReviewCategory[];
  transactions:ReviewTransaction[];
};

function formatSar(value:number|string){
  const amount=Number(value);
  return new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(Number.isFinite(amount)?amount:0);
}

function actionLabel(action:ReviewAction){
  if(action==='EXPENSE') return 'مصروف';
  if(action==='INCOME') return 'دخل';
  if(action==='REFUND') return 'استرداد';
  if(action==='INTERNAL_TRANSFER') return 'تحويل داخلي';
  if(action==='MATCH_EXISTING') return 'مطابقة بحركة موجودة';
  return 'تجاهل';
}

function errorLabel(code:string){
  const map:Record<string,string>={
    STATEMENT_TRANSACTION_DATE_REQUIRED:'أدخل تاريخ الحركة قبل اعتمادها.',
    STATEMENT_TRANSACTION_DATE_INVALID:'تاريخ الحركة غير صالح.',
    STATEMENT_MATCH_TRANSACTION_REQUIRED:'اختر الحركة الموجودة التي تريد مطابقتها.',
    STATEMENT_TRANSFER_ACCOUNT_REQUIRED:'اختر الحساب الآخر للتحويل الداخلي.',
    STATEMENT_TRANSFER_ACCOUNT_INVALID:'الحساب الآخر غير صالح أو هو نفس الحساب.',
    STATEMENT_REFUND_ORIGINAL_REQUIRED:'اختر المصروف الأصلي المرتبط بهذا الاسترداد.',
    STATEMENT_REFUND_ORIGINAL_INVALID:'المصروف الأصلي غير صالح للمطابقة.',
    STATEMENT_REFUND_EXCEEDS_ORIGINAL:'مجموع الاستردادات يتجاوز قيمة المصروف الأصلي.',
    STATEMENT_EXPENSE_CATEGORY_REQUIRED:'اختر بند الميزانية للمصروف.',
    STATEMENT_EXPENSE_PLANNING_REQUIRED:'حدد هل المصروف مخطط أم غير مخطط.',
    STATEMENT_EXPENSE_NATURE_REQUIRED:'حدد طبيعة المصروف.',
    STATEMENT_INCOME_KIND_REQUIRED:'حدد نوع الدخل.',
    STATEMENT_ROW_ALREADY_REVIEWED:'تمت مراجعة هذه الحركة بالفعل.',
  };
  return map[code]??'تعذر حفظ المراجعة. لم ينشئ نماء أي حركة جديدة.';
}

export function StatementReviewPanel({
  enabled,
  refreshKey,
  onChanged,
}:{
  enabled:boolean;
  refreshKey:number;
  onChanged?:()=>void|Promise<void>;
}){
  const [bundle,setBundle]=useState<ReviewBundle|null>(null);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [activeRowId,setActiveRowId]=useState('');
  const [action,setAction]=useState<ReviewAction>('EXPENSE');
  const [categoryId,setCategoryId]=useState('');
  const [planningStatus,setPlanningStatus]=useState<'PLANNED'|'UNPLANNED'>('UNPLANNED');
  const [expenseNature,setExpenseNature]=useState<'NECESSARY'|'IMPORTANT'|'OPTIONAL'|'ENTERTAINMENT'|'UNPLANNED'>('UNPLANNED');
  const [incomeKind,setIncomeKind]=useState<'SALARY'|'ADDITIONAL_INCOME'|'BONUS'|'OTHER'>('OTHER');
  const [incomeSource,setIncomeSource]=useState('');
  const [relatedTransactionId,setRelatedTransactionId]=useState('');
  const [otherAccountId,setOtherAccountId]=useState('');
  const [matchedTransactionId,setMatchedTransactionId]=useState('');
  const [transactionDate,setTransactionDate]=useState('');

  function activateRow(row:ReviewRow){
    setActiveRowId(row.id);
    setAction(row.direction==='DEBIT'?'EXPENSE':'INCOME');
    setTransactionDate(row.transaction_date??'');
    setIncomeSource(row.description);
    setCategoryId('');
    setRelatedTransactionId('');
    setOtherAccountId('');
    setMatchedTransactionId('');
    setPlanningStatus('UNPLANNED');
    setExpenseNature('UNPLANNED');
    setIncomeKind('OTHER');
  }

  async function load(){
    if(!enabled) return;
    setLoading(true);
    try{
      const response=await fetch('/api/conversations/central/statement/review',{cache:'no-store'});
      const data=await response.json() as ReviewBundle;
      if(!response.ok) throw new Error('load');
      setBundle(data);
      const pending=(data.rows??[]).find(row=>row.review_status==='NEEDS_REVIEW');
      if(pending) activateRow(pending);
      else setActiveRowId('');
      setError('');
    }catch{
      setError('تعذر تحميل مراجعة كشف الحساب الآن.');
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    if(!enabled) return;
    let cancelled=false;
    void fetch('/api/conversations/central/statement/review',{cache:'no-store'})
      .then(async response=>{
        if(!response.ok) throw new Error('load');
        return response.json() as Promise<ReviewBundle>;
      })
      .then(data=>{
        if(cancelled) return;
        setBundle(data);
        const pending=(data.rows??[]).find(row=>row.review_status==='NEEDS_REVIEW');
        if(pending){
          setActiveRowId(pending.id);
          setAction(pending.direction==='DEBIT'?'EXPENSE':'INCOME');
          setTransactionDate(pending.transaction_date??'');
          setIncomeSource(pending.description);
          setCategoryId('');
          setRelatedTransactionId('');
          setOtherAccountId('');
          setMatchedTransactionId('');
          setPlanningStatus('UNPLANNED');
          setExpenseNature('UNPLANNED');
          setIncomeKind('OTHER');
        }else{
          setActiveRowId('');
        }
        setError('');
        setLoading(false);
      })
      .catch(()=>{
        if(cancelled) return;
        setError('تعذر تحميل مراجعة كشف الحساب الآن.');
        setLoading(false);
      });
    return()=>{cancelled=true};
  },[enabled,refreshKey]);

  const pendingRows=useMemo(
    ()=>bundle?.rows.filter(row=>row.review_status==='NEEDS_REVIEW')??[],
    [bundle],
  );
  const activeRow=useMemo(
    ()=>pendingRows.find(row=>row.id===activeRowId)??pendingRows[0]??null,
    [pendingRows,activeRowId],
  );

  const availableActions:ReviewAction[]=activeRow?.direction==='DEBIT'
    ? ['EXPENSE','INTERNAL_TRANSFER','MATCH_EXISTING','IGNORE']
    : ['INCOME','REFUND','INTERNAL_TRANSFER','MATCH_EXISTING','IGNORE'];

  const originalExpenses=bundle?.transactions.filter(
    tx=>tx.transaction_type==='EXPENSE'&&tx.status==='POSTED',
  )??[];
  const otherAccounts=bundle?.accounts.filter(
    account=>account.id!==bundle.statement_import?.account_id,
  )??[];

  async function submit(event:FormEvent){
    event.preventDefault();
    if(!activeRow||saving) return;
    setSaving(true);
    setError('');
    try{
      const payload:Record<string,unknown>={
        row_id:activeRow.id,
        action,
        transaction_date:transactionDate||undefined,
      };
      if(action==='EXPENSE'){
        payload.category_id=categoryId;
        payload.planning_status=planningStatus;
        payload.expense_nature=expenseNature;
      }else if(action==='INCOME'){
        payload.income_kind=incomeKind;
        payload.income_source_name=incomeSource;
      }else if(action==='REFUND'){
        payload.related_transaction_id=relatedTransactionId;
      }else if(action==='INTERNAL_TRANSFER'){
        payload.other_account_id=otherAccountId;
      }else if(action==='MATCH_EXISTING'){
        payload.matched_transaction_id=matchedTransactionId;
      }

      const response=await fetch('/api/conversations/central/statement/review',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(payload),
      });
      const data=await response.json() as {code?:string};
      if(!response.ok){
        setError(errorLabel(data.code??''));
        return;
      }
      await load();
      await onChanged?.();
    }catch{
      setError('تعذر حفظ المراجعة. لم ينشئ نماء أي حركة جديدة.');
    }finally{
      setSaving(false);
    }
  }

  if(!enabled) return null;
  if(loading&&!bundle) return <section className={styles.statementReviewPanel}><p>جارٍ تحميل الحركات للمراجعة…</p></section>;
  if(!bundle?.statement_import) return null;

  return <section className={styles.statementReviewPanel} aria-label="مراجعة كشف الحساب">
    <header className={styles.statementReviewHeader}>
      <div>
        <strong>مراجعة كشف الحساب</strong>
        <small>{bundle.statement_import.file_name} · {bundle.statement_import.bank_name||bundle.statement_import.account_name}</small>
      </div>
      <span>{pendingRows.length} بانتظار المراجعة</span>
    </header>

    {!pendingRows.length
      ? <div className={styles.statementReviewDone}><LucideIcon name="circleCheck" size={20}/><span>اكتملت مراجعة صفوف هذا الكشف. بقيت المطابقات المرحلية بحسب نوع كل حركة.</span></div>
      : <>
        <div className={styles.statementRowStrip}>
          {pendingRows.map(row=><button
            key={row.id}
            type="button"
            className={row.id===activeRow?.id?styles.statementRowActive:''}
            onClick={()=>activateRow(row)}
          >
            <small>#{row.row_number}</small>
            <strong>{row.description}</strong>
            <span>{formatSar(row.amount)} ر.س</span>
          </button>)}
        </div>

        {activeRow&&<form className={styles.statementReviewForm} onSubmit={submit}>
          <div className={styles.statementRowSummary}>
            <span className={activeRow.direction==='DEBIT'?styles.statementDebit:styles.statementCredit}>
              {activeRow.direction==='DEBIT'?'خصم':'إيداع'}
            </span>
            <div>
              <strong>{activeRow.description}</strong>
              <small>{activeRow.transaction_date||'التاريخ غير موجود في الكشف'} · {formatSar(activeRow.amount)} ر.س</small>
            </div>
          </div>

          <label>
            <span>طبيعة الحركة</span>
            <select value={action} onChange={event=>setAction(event.target.value as ReviewAction)}>
              {availableActions.map(value=><option key={value} value={value}>{actionLabel(value)}</option>)}
            </select>
          </label>

          {!activeRow.transaction_date&&action!=='MATCH_EXISTING'&&action!=='IGNORE'&&<label>
            <span>تاريخ الحركة</span>
            <input type="date" value={transactionDate} onChange={event=>setTransactionDate(event.target.value)} required />
          </label>}

          {action==='EXPENSE'&&<>
            <label>
              <span>بند الميزانية</span>
              <select value={categoryId} onChange={event=>{
                const next=event.target.value;
                setCategoryId(next);
                const category=bundle.categories.find(item=>item.id===next);
                const nature=category?.expense_nature_default;
                if(nature==='NECESSARY'||nature==='IMPORTANT'||nature==='OPTIONAL'||nature==='ENTERTAINMENT'||nature==='UNPLANNED'){
                  setExpenseNature(nature);
                }
              }} required>
                <option value="">اختر البند</option>
                {bundle.categories.map(category=><option key={category.id} value={category.id}>{category.category_group} — {category.name}</option>)}
              </select>
            </label>
            <label>
              <span>التخطيط</span>
              <select value={planningStatus} onChange={event=>setPlanningStatus(event.target.value as 'PLANNED'|'UNPLANNED')}>
                <option value="PLANNED">مخطط</option>
                <option value="UNPLANNED">غير مخطط</option>
              </select>
            </label>
            <label>
              <span>طبيعة المصروف</span>
              <select value={expenseNature} onChange={event=>setExpenseNature(event.target.value as typeof expenseNature)}>
                <option value="NECESSARY">ضروري</option>
                <option value="IMPORTANT">مهم</option>
                <option value="OPTIONAL">اختياري</option>
                <option value="ENTERTAINMENT">ترفيهي</option>
                <option value="UNPLANNED">غير مخطط</option>
              </select>
            </label>
          </>}

          {action==='INCOME'&&<>
            <label>
              <span>نوع الدخل</span>
              <select value={incomeKind} onChange={event=>setIncomeKind(event.target.value as typeof incomeKind)}>
                <option value="SALARY">راتب</option>
                <option value="ADDITIONAL_INCOME">دخل إضافي</option>
                <option value="BONUS">مكافأة</option>
                <option value="OTHER">دخل آخر</option>
              </select>
            </label>
            <label>
              <span>مصدر الدخل</span>
              <input value={incomeSource} onChange={event=>setIncomeSource(event.target.value)} required maxLength={240}/>
            </label>
          </>}

          {action==='REFUND'&&<label>
            <span>المصروف الأصلي</span>
            <select value={relatedTransactionId} onChange={event=>setRelatedTransactionId(event.target.value)} required>
              <option value="">اختر المصروف المرتبط</option>
              {originalExpenses.map(tx=><option key={tx.id} value={tx.id}>{tx.transaction_date} — {tx.description||'مصروف'} — {formatSar(tx.amount)} ر.س</option>)}
            </select>
          </label>}

          {action==='INTERNAL_TRANSFER'&&<label>
            <span>الحساب الآخر</span>
            <select value={otherAccountId} onChange={event=>setOtherAccountId(event.target.value)} required>
              <option value="">اختر الحساب</option>
              {otherAccounts.map(account=><option key={account.id} value={account.id}>{account.bank_name||account.name} — {account.name}</option>)}
            </select>
          </label>}

          {action==='MATCH_EXISTING'&&<label>
            <span>الحركة الموجودة</span>
            <select value={matchedTransactionId} onChange={event=>setMatchedTransactionId(event.target.value)} required>
              <option value="">اختر الحركة</option>
              {bundle.transactions.map(tx=><option key={tx.id} value={tx.id}>{tx.transaction_date} — {tx.description||tx.transaction_type} — {formatSar(tx.amount)} ر.س</option>)}
            </select>
          </label>}

          <button type="submit" className={styles.statementReviewSubmit} disabled={saving}>
            <LucideIcon name={action==='IGNORE'?'x':'circleCheck'} size={16}/>
            <span>{saving?'جارٍ الحفظ…':action==='IGNORE'?'تجاهل هذه الحركة':'اعتماد تصنيف الحركة'}</span>
          </button>
          <p className={styles.statementReviewSafety}>اعتماد التصنيف لا ينفذ تحويلًا أو سدادًا أو استثمارًا خارجيًا. التحويل الداخلي يبقى بانتظار المطابقة المقابلة.</p>
        </form>}
      </>}
    {error&&<div className={styles.statementReviewError} role="alert">{error}</div>}
  </section>;
}
