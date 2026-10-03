'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SmartComboInput } from '@/components/forms/smart-combo-input';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { deactivateAccountAction, updateAccountAction } from './actions';

type AccountType = 'BANK'|'SAVINGS'|'CASH'|'OTHER';

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
};

const labels: Record<AccountType,string> = { BANK:'حساب جاري', SAVINGS:'ادخار', CASH:'نقدي', OTHER:'أخرى' };

export function AccountDetailsFlow({ account, editable, accountNames, bankNames }: Props) {
  const [page, setPage] = useState<'summary'|'edit'>('summary');

  return <div className="namaa-account-detail-flow">
    <nav className="namaa-detail-tabs" aria-label="تفاصيل الحساب">
      <button type="button" className={page==='summary'?'is-active':''} onClick={()=>setPage('summary')}>التفاصيل</button>
      <button type="button" className={page==='edit'?'is-active':''} onClick={()=>setPage('edit')}>التعديل</button>
    </nav>

    <section className="namaa-detail-page" hidden={page!=='summary'}>
      <div className="namaa-account-overview-grid">
        <div><span>النوع</span><strong>{labels[account.accountType]}</strong></div>
        <div><span>البنك/الجهة</span><strong>{account.bankName || '—'}</strong></div>
        <div><span>آخر البطاقة</span><strong>{account.cardLast4 ? `•••• ${account.cardLast4}` : '—'}</strong></div>
        <div><span>الرصيد الحالي</span><strong className="namaa-detail-balance"><Image src="/brand/saudi-riyal-symbol.png" alt="" width={18} height={18} unoptimized/><span>{account.balanceText}</span></strong></div>
      </div>
      <div className="namaa-detail-page-actions">
        <button type="button" className="primary-button" onClick={()=>setPage('edit')}><LucideIcon name="pencil" size={20}/> تعديل الحساب</button>
      </div>
    </section>

    <section className="namaa-detail-page" hidden={page!=='edit'}>
      {editable ? <form className="namaa-account-edit-form" action={updateAccountAction}>
        <input type="hidden" name="accountId" value={editable.id}/>
        <input type="hidden" name="returnTo" value="/accounts"/>
        <label><span className="field-title">اسم الحساب</span><SmartComboInput name="name" options={accountNames} defaultValue={editable.name} placeholder="اختر أو اكتب اسم الحساب" ariaLabel="اسم الحساب"/></label>
        <label><span className="field-title">نوع الحساب</span>
          <select name="accountType" defaultValue={account.accountType}>
            <option value="BANK">حساب جاري</option>
            <option value="SAVINGS">ادخار</option>
            <option value="CASH">نقدي</option>
            <option value="OTHER">أخرى</option>
          </select>
        </label>
        <label><span className="field-title">البنك أو الجهة</span><SmartComboInput name="bankName" options={bankNames} defaultValue={editable.bankName} placeholder="اختر أو اكتب اسم البنك" ariaLabel="البنك أو الجهة"/></label>
        <label><span className="field-title">الرصيد الافتتاحي</span><input name="openingBalance" inputMode="decimal" defaultValue={editable.openingBalance} required/></label>
        <label><span className="field-title">تاريخ الرصيد</span><input name="effectiveDate" type="date" defaultValue={editable.effectiveDate} required/></label>
        <label><span className="field-title">IBAN</span><input name="iban" dir="ltr" defaultValue={editable.iban}/></label>
        <label><span className="field-title">آخر 4 أرقام</span><input name="cardLast4" inputMode="numeric" maxLength={4} defaultValue={account.cardLast4}/></label>
        <div className="namaa-detail-sticky-actions">
          <button className="secondary-button" type="button" onClick={()=>setPage('summary')}>رجوع</button>
          <button className="primary-button" type="submit"><LucideIcon name="pencil" size={20}/> حفظ التعديلات</button>
        </div>
      </form> : <p className="form-error">تعذر تحميل بيانات الحساب القابلة للتعديل.</p>}

      <section className="namaa-account-danger-section">
        <div><strong>تعطيل الحساب</strong><span>يبقى السجل التاريخي محفوظًا ولا يتم حذف الحركات السابقة.</span></div>
        <form action={deactivateAccountAction}><input type="hidden" name="accountId" value={account.id}/><button className="danger-button" type="submit"><LucideIcon name="ban" size={16}/><span>تعطيل الحساب</span></button></form>
      </section>
    </section>
  </div>;
}
