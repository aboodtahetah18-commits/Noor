'use client';

import { useActionState, useState } from 'react';
import { createAccountAction } from '../actions';
import { SmartComboInput } from '@/components/forms/smart-combo-input';
import { LucideIcon } from '@/components/ui/lucide-icon';

const initialState: { error?: string } = {};

export function AccountForm({ accountNames, bankNames }: { accountNames: string[]; bankNames: string[] }) {
  const [state, action, pending] = useActionState(createAccountAction, initialState);
  const [step, setStep] = useState<1 | 2>(1);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="account-form account-form-v2 smart-account-form namaa-account-wizard">
      <div className="namaa-wizard-progress" aria-label="خطوات إضافة الحساب">
        <button type="button" className={step === 1 ? 'is-active' : ''} onClick={() => setStep(1)}>
          <span>1</span><strong>البيانات الأساسية</strong>
        </button>
        <button type="button" className={step === 2 ? 'is-active' : ''} onClick={() => setStep(2)}>
          <span>2</span><strong>المطابقة البنكية</strong>
        </button>
      </div>

      <section className="namaa-wizard-page" hidden={step !== 1}>
        <div className="account-form-primary-grid">
          <label className="account-form-name"><span className="field-title">اسم الحساب</span><SmartComboInput name="name" options={accountNames} required maxLength={120} placeholder="اسم الحساب" ariaLabel="اسم الحساب" /></label>
          <label className="account-form-bank"><span className="field-title">البنك أو الجهة</span><SmartComboInput name="bankName" options={bankNames} maxLength={120} placeholder="البنك أو الجهة" ariaLabel="البنك أو الجهة" /></label>
          <label className="account-form-balance"><span className="field-title">الرصيد الافتتاحي</span><div className="money-field"><input name="openingBalance" inputMode="decimal" defaultValue="0.00" required /><span>ريال</span></div></label>
          <label className="account-form-date"><span className="field-title">تاريخ الرصيد</span><input name="effectiveDate" type="date" defaultValue={today} required /></label>
        </div>
      </section>

      <section className="namaa-wizard-page" hidden={step !== 2}>
        <div className="form-grid smart-account-form onboarding-optional-grid">
          <label><span className="field-title">IBAN</span><input name="iban" dir="ltr" autoCapitalize="characters" autoComplete="off" placeholder="SA00 0000 0000 0000 0000 0000" /></label>
          <label><span className="field-title">آخر 4 أرقام</span><input name="cardLast4" inputMode="numeric" maxLength={4} autoComplete="off" placeholder="1234" /></label>
        </div>
        <p className="namaa-wizard-hint">هذه البيانات اختيارية وتساعد على المطابقة البنكية لاحقًا.</p>
      </section>

      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}

      <div className="p49-dialog-actions account-form-actions namaa-wizard-actions">
        {step === 1 ? (
          <button className="primary-button" type="button" onClick={() => setStep(2)}>
            التالي <LucideIcon name="chevronLeft" size={20}/>
          </button>
        ) : (
          <>
            <button className="secondary-button" type="button" onClick={() => setStep(1)}>
              <LucideIcon name="chevronRight" size={20}/> السابق
            </button>
            <button className="primary-button" type="submit" disabled={pending}>
              <LucideIcon name="plus" size={20}/>{pending ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
