'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SmartComboInput } from '@/components/forms/smart-combo-input';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { deactivateAccountAction, updateAccountAction } from './actions';

type AccountType = 'BANK'|'SAVINGS'|'CASH'|'OTHER';
type ActivityPeriod = { key:string; label:string; count:number; net:string; };
type ActivitySummary = {
  totalTransactions:number;
  firstTransactionDate:string|null;
  totalInflow:string;
  totalOutflow:string;
  monthInflow:string;
  monthOutflow:string;
  monthNet:string;
  dominantCategory:string|null;
  status:'NO_DATA'|'STABLE'|'WATCH';
  challenge:string;
  periods:ActivityPeriod[];
};

type Props = {
  account: {
    id: string;
    name: string;
    accountType: AccountType;
    bankName: string;
    cardLast4: string;
    balanceText: string;
  };
  editable?: {
    id: string;
    name: string;
    bankName: string;
    openingBalance: string;
    effectiveDate: string;
    iban: string;
  } | null;
  accountNames: string[];
  bankNames: string[];
  activity?: ActivitySummary | null;
};

const labels: Record<AccountType,string> = { BANK:'حساب جاري', SAVINGS:'ادخار', CASH:'نقدي', OTHER:'أخرى' };

function money(value:string){
  const n=Number(value||0);
  return Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):value;
}

export function AccountDetailsFlow({ account, editable, accountNames, bankNames, activity }: Props) {
  const [tab,setTab]=useState<'details'|'activity'|'manage'>('details');
  const [editing,setEditing]=useState(false);

  return <div className="namaa-account-detail-system">
    <nav className="namaa-detail-tabs namaa-detail-tabs-three" aria-label="صفحات الحساب">
      <button type="button" className={tab==='details'?'is-active':''} onClick={()=>{setTab('details');setEditing(false)}}>التفاصيل</button>
      <button type="button" className={tab==='activity'?'is-active':''} onClick={()=>{setTab('activity');setEditing(false)}}>النشاط المالي</button>
      <button type="button" className={tab==='manage'?'is-active':''} onClick={()=>{setTab('manage');setEditing(false)}}>إدارة الحساب</button>
    </nav>

    <section className="namaa-detail-page" hidden={tab!=='details'}>
      {!editing ? <>
        <div className="namaa-account-overview-grid">
          <div><span>اسم الحساب</span><strong>{account.name}</strong></div>
          <div><span>النوع</span><strong>{labels[account.accountType]}</strong></div>
          <div><span>البنك/الجهة</span><strong className="namaa-bank-value">{account.bankName||'—'}</strong></div>
          <div><span>آخر البطاقة</span><strong>{account.cardLast4?`•••• ${account.cardLast4}`:'—'}</strong></div>
          <div className="namaa-overview-wide"><span>IBAN</span><strong dir="ltr">{editable?.iban||'—'}</strong></div>
          <div><span>الرصيد الحالي</span><strong className="namaa-detail-balance"><Image src="/brand/saudi-riyal-symbol.png" alt="" width={18} height={18} unoptimized/><span>{account.balanceText}</span></strong></div>
          <div><span>تاريخ الرصيد</span><strong>{editable?.effectiveDate||'—'}</strong></div>
        </div>
        <div className="namaa-detail-page-actions">
          <button type="button" className="primary-button" onClick={()=>setEditing(true)}><LucideIcon name="pencil" size={20}/> تعديل الحساب</button>
        </div>
      </> : editable ? <form className="namaa-account-edit-form-v2" action={updateAccountAction}>
        <input type="hidden" name="accountId" value={editable.id}/>
        <input type="hidden" name="returnTo" value="/accounts"/>

        <section className="namaa-edit-section">
          <div className="namaa-edit-section-head"><h3>بيانات الحساب</h3></div>
          <div className="namaa-edit-grid">
            <label className="namaa-field-wide"><span className="field-title">اسم الحساب</span><SmartComboInput name="name" options={accountNames} defaultValue={editable.name} placeholder="اختر أو اكتب اسم الحساب" ariaLabel="اسم الحساب"/></label>
            <label><span className="field-title">نوع الحساب</span><select name="accountType" defaultValue={account.accountType}><option value="BANK">حساب جاري</option><option value="SAVINGS">ادخار</option><option value="CASH">نقدي</option><option value="OTHER">أخرى</option></select></label>
            <label><span className="field-title">البنك أو الجهة</span><SmartComboInput name="bankName" options={bankNames} defaultValue={editable.bankName} placeholder="اختر أو اكتب اسم البنك" ariaLabel="البنك أو الجهة"/></label>
          </div>
        </section>

        <section className="namaa-edit-section">
          <div className="namaa-edit-section-head"><h3>البطاقة والمطابقة</h3></div>
          <div className="namaa-edit-grid">
            <label><span className="field-title">آخر 4 أرقام</span><input name="cardLast4" inputMode="numeric" maxLength={4} defaultValue={account.cardLast4}/></label>
            <label className="namaa-field-wide"><span className="field-title">IBAN</span><input name="iban" dir="ltr" defaultValue={editable.iban}/></label>
          </div>
        </section>

        <section className="namaa-edit-section">
          <div className="namaa-edit-section-head"><h3>الرصيد</h3></div>
          <div className="namaa-edit-grid">
            <div className="namaa-current-balance"><span>الرصيد الحالي</span><strong><Image src="/brand/saudi-riyal-symbol.png" alt="" width={18} height={18} unoptimized/><span>{account.balanceText}</span></strong></div>
            <label><span className="field-title">الرصيد الافتتاحي</span><input name="openingBalance" inputMode="decimal" defaultValue={editable.openingBalance} required/></label>
            <label><span className="field-title">تاريخ الرصيد</span><input name="effectiveDate" type="date" defaultValue={editable.effectiveDate} required/></label>
          </div>
        </section>

        <div className="namaa-detail-sticky-actions">
          <button className="secondary-button" type="button" onClick={()=>setEditing(false)}>إلغاء</button>
          <button className="primary-button" type="submit"><LucideIcon name="pencil" size={20}/> حفظ التعديلات</button>
        </div>
      </form> : <p className="form-error">تعذر تحميل بيانات الحساب القابلة للتعديل.</p>}
    </section>

    <section className="namaa-detail-page" hidden={tab!=='activity'}>
      {activity ? <>
        <div className="namaa-account-activity-head namaa-account-activity-head-rich">
          <div><span>إجمالي العمليات</span><strong>{activity.totalTransactions}</strong></div>
          <div><span>إجمالي الداخل</span><strong className="is-positive"><Image src="/brand/saudi-riyal-symbol.png" alt="" width={16} height={16} unoptimized/>{money(activity.totalInflow)}</strong></div>
          <div><span>إجمالي الخارج</span><strong className="is-negative"><Image src="/brand/saudi-riyal-symbol.png" alt="" width={16} height={16} unoptimized/>{money(activity.totalOutflow)}</strong></div>
          <div><span>صافي هذا الشهر</span><strong className={Number(activity.monthNet)>=0?'is-positive':'is-negative'}><Image src="/brand/saudi-riyal-symbol.png" alt="" width={16} height={16} unoptimized/>{money(activity.monthNet)}</strong></div>
        </div>

        <section className="namaa-activity-assessment">
          <div><span>حالة الحساب</span><strong className={activity.status==='STABLE'?'is-stable':activity.status==='WATCH'?'is-watch':'is-neutral'}>{activity.status==='STABLE'?'مستقر':activity.status==='WATCH'?'يحتاج متابعة':'بيانات غير كافية'}</strong></div>
          <div><span>البند المرتبط الأكثر استخدامًا</span><strong>{activity.dominantCategory??'غير محدد'}</strong></div>
          <div className="is-wide"><span>الملاحظة</span><strong>{activity.challenge}</strong></div>
        </section>

        <div className="namaa-activity-period-grid">
          {activity.periods.map(period=>{
            const net=Number(period.net||0);
            return <article key={period.key} className="namaa-activity-period-card">
              <span>{period.label}</span>
              <strong>{period.count} عملية</strong>
              <div className={net>0?'is-positive':net<0?'is-negative':'is-neutral'}>
                <Image src="/brand/saudi-riyal-symbol.png" alt="" width={16} height={16} unoptimized/>
                <b>{money(period.net)}</b>
              </div>
            </article>;
          })}
        </div>

        <div className="namaa-activity-footnote">
          <span>أول حركة</span><strong>{activity.firstTransactionDate??'—'}</strong>
        </div>
      </> : <div className="namaa-activity-empty" role="status">
        <strong>لا توجد حركة مالية حتى الآن</strong>
        <span>ستظهر هنا المبالغ، المؤشرات، حالة الحساب، والبند المرتبط بعد تسجيل أول عملية على هذا الحساب.</span>
      </div>}
    </section>

    <section className="namaa-detail-page" hidden={tab!=='manage'}>
      <section className="namaa-management-card">
        <div><span>الحالة</span><strong>نشط</strong></div>
        <p>تعطيل الحساب يوقف استخدامه في العمليات الجديدة مع الاحتفاظ بالسجل التاريخي كاملًا.</p>
      </section>
      <section className="namaa-account-danger-section">
        <div><strong>تعطيل الحساب</strong><span>لن يتم حذف الحركات السابقة أو تغيير الأرصدة التاريخية.</span></div>
        <form action={deactivateAccountAction}><input type="hidden" name="accountId" value={account.id}/><button className="danger-button" type="submit"><LucideIcon name="ban" size={16}/><span>تعطيل الحساب</span></button></form>
      </section>
      <section className="namaa-delete-policy">
        <strong>الحذف النهائي</strong>
        <span>{(activity?.totalTransactions??0)>0?'غير متاح للحساب المرتبط بسجل مالي حفاظًا على سلامة السجل.':'لا توجد حركات على الحساب؛ يبقى الحذف النهائي محميًا حتى التحقق من جميع المراجع المالية.'}</span>
      </section>
    </section>
  </div>;
}
