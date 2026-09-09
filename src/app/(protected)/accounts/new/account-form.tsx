'use client';

import { useActionState } from 'react';
import { createAccountAction } from '../actions';
import { SmartComboInput } from '@/components/forms/smart-combo-input';
import { LucideIcon } from '@/components/ui/lucide-icon';

const initialState: { error?: string } = {};

export function AccountForm({ accountNames, bankNames }: { accountNames: string[]; bankNames: string[] }) {
  const [state, action, pending] = useActionState(createAccountAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="account-form account-form-v2 smart-account-form">
      <div className="account-form-primary-grid">
        <label className="account-form-name"><span className="field-title">اسم الحساب</span><SmartComboInput name="name" options={accountNames} required maxLength={120} placeholder="اسم الحساب" ariaLabel="اسم الحساب" /></label>
        <label className="account-form-bank"><span className="field-title">البنك أو الجهة</span><SmartComboInput name="bankName" options={bankNames} maxLength={120} placeholder="البنك أو الجهة" ariaLabel="البنك أو الجهة" /></label>
        <label className="account-form-balance"><span className="field-title">الرصيد الافتتاحي</span><div className="money-field"><input name="openingBalance" inputMode="decimal" defaultValue="0.00" required /><span>ريال</span></div></label>
        <label className="account-form-date"><span className="field-title">تاريخ الرصيد</span><input name="effectiveDate" type="date" defaultValue={today} required /></label>
      </div>

      <details className="onboarding-optional-details onboarding-optional-details-v2 account-form-matching">
        <summary>بيانات المطابقة البنكية <small>اختياري</small></summary>
        <div className="form-grid smart-account-form onboarding-optional-grid">
          <label><span className="field-title">IBAN</span><input name="iban" dir="ltr" autoCapitalize="characters" autoComplete="off" placeholder="SA00 0000 0000 0000 0000 0000" /></label>
          <label><span className="field-title">آخر 4 أرقام</span><input name="cardLast4" inputMode="numeric" maxLength={4} autoComplete="off" placeholder="1234" /></label>
        </div>
      </details>

      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <div className="p49-dialog-actions account-form-actions"><button className="primary-button" type="submit" disabled={pending}><LucideIcon name="plus" size={20}/>{pending ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}</button></div>
    </form>
  );
}
