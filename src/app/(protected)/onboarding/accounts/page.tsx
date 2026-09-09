import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getOnboardingStatus } from '@/features/onboarding/queries/get-onboarding-status';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { BANK_OPTIONS, bankByCode } from '@/features/accounts/banks';
import { ACCOUNT_NAME_PRESETS } from '@/features/accounts/account-name-options';
import { OnboardingStepNav } from '@/features/onboarding/components/onboarding-step-nav';
import { addOnboardingAccountAction, continueFromAccountsAction } from '../actions';
import { Money, sumMoney } from '@/financial-engine/money';
import { formatSar } from '@/lib/format-money';
import { SmartComboInput } from '@/components/forms/smart-combo-input';
import { LucideIcon } from '@/components/ui/lucide-icon';

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const user = await requireAuthenticatedUser();
  const [status, accounts, query] = await Promise.all([
    getOnboardingStatus(user.id),
    listAccounts(user.id, false),
    searchParams,
  ]);
  if (status.completed) redirect('/dashboard');
  if (!status.started) redirect('/onboarding');
  const total = sumMoney(accounts.map((account) => Money.parse(account.balance)));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
  const accountNames = [...new Set([...ACCOUNT_NAME_PRESETS, ...accounts.map((a) => a.name)])];
  const bankNames = [...new Set([...BANK_OPTIONS.map((b) => b.name), ...accounts.map((a) => a.bankName).filter((v): v is string => Boolean(v))])];

  return (
    <main className="app-page onboarding-page" dir="rtl">
      <div className="page-shell onboarding-money-shell onboarding-money-shell-v2 p47-closure-page">
        <div className="onboarding-utility-row">
          <Link href="/dashboard" className="onboarding-home-link" aria-label="العودة إلى الرئيسية"><LucideIcon name="house" size={20}/><span>الرئيسية</span></Link>
          <span className="onboarding-step-count">الخطوة 2 من 6</span>
        </div>
        <OnboardingStepNav current="/onboarding/accounts" />
        <header className="onboarding-money-hero">
          <div className="onboarding-money-hero-title">
            <span className="onboarding-money-hero-icon" aria-hidden="true"><LucideIcon name="walletCards" size={24}/></span>
            <div><span>الحسابات والأرصدة</span><h1>أين توجد أموالك الآن؟</h1></div>
          </div>
          <div className="money-location-total money-location-total-v2"><span>إجمالي الأموال</span><strong>{formatSar(total)}</strong><small>{accounts.length ? `${accounts.length} حساب` : 'لم تضف حسابًا بعد'}</small></div>
        </header>

        {query.error ? <p className="form-error" role="alert">{query.error}</p> : null}
        {query.created ? <p className="auth-success" role="status">تمت إضافة الحساب.</p> : null}

        <section className="card onboarding-account-builder onboarding-account-builder-v2">
          <div className="onboarding-section-title"><span className="step-dot">1</span><div><h2>أضف حسابك الأساسي</h2><small>اسم الحساب ورصيده يكفيان للبدء.</small></div></div>
          <form className="form-grid smart-account-form onboarding-primary-account-form" action={addOnboardingAccountAction}>
            <label className="onboarding-account-name-field"><span className="field-title">اسم الحساب</span><SmartComboInput name="name" options={accountNames} required placeholder="اسم الحساب" ariaLabel="اسم الحساب" /></label>
            <label className="onboarding-bank-field"><span className="field-title">البنك أو الجهة</span><SmartComboInput name="bankName" options={bankNames} placeholder="البنك أو الجهة" ariaLabel="البنك أو الجهة" /></label>
            <label className="onboarding-balance-field"><span className="field-title">الرصيد الافتتاحي</span><input name="openingBalance" inputMode="decimal" required defaultValue="0.00" /></label>
            <label className="onboarding-date-field"><span className="field-title">تاريخ الرصيد</span><input name="effectiveDate" type="date" required defaultValue={today} /></label>
            <details className="full onboarding-optional-details onboarding-optional-details-v2"><summary>بيانات المطابقة البنكية <small>اختياري</small></summary><div className="form-grid smart-account-form onboarding-optional-grid"><label><span className="field-title">IBAN</span><input name="iban" dir="ltr" autoCapitalize="characters" autoComplete="off" placeholder="SA00 0000 0000 0000 0000 0000" /></label><label><span className="field-title">آخر 4 أرقام</span><input name="cardLast4" inputMode="numeric" maxLength={4} autoComplete="off" placeholder="1234" /></label></div></details>
            <div className="full onboarding-add-account-action"><button className="primary-button" type="submit"><LucideIcon name="plus" size={20}/>إضافة الحساب</button></div>
          </form>
        </section>

        <section className="card money-locations-card money-locations-card-v2">
          <div className="onboarding-section-title"><span className="step-dot">2</span><div><h2>حساباتك الحالية</h2><small>تظهر هنا الحسابات بعد إضافتها.</small></div></div>
          {accounts.length === 0 ? <div className="empty-compact">لا توجد حسابات بعد.</div> : (
            <div className="money-location-grid">
              {accounts.map((account) => {
                const bank = bankByCode(account.bankCode);
                const identity = bank?.shortName ?? account.bankName ?? account.name;
                return (
                  <article className="money-location-item" key={account.id}>
                    <div className="bank-identity-badge" data-bank={account.bankCode ?? 'CUSTOM'} aria-label={account.bankName ?? account.name}>{identity.slice(0, 2)}</div>
                    <div className="money-location-main"><strong>{account.name}</strong><span>{account.bankName ?? 'بدون بنك'}</span><small>{[account.ibanMasked, account.cardLast4 ? `بطاقة •••• ${account.cardLast4}` : undefined].filter(Boolean).join(' · ')}</small></div>
                    <div className="money-location-balance"><span>الرصيد</span><strong>{formatSar(account.balance)}</strong><Link className="mini-edit-link" href={`/accounts/${account.id}/edit?returnTo=/onboarding/accounts`}>تعديل</Link></div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <form className="onboarding-next onboarding-next-v2" action={continueFromAccountsAction}><button className="primary-button" type="submit">اعتماد والمتابعة</button></form>
      </div>
    </main>
  );
}
