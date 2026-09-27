import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { Money, sumMoney } from '@/financial-engine/money';
import { formatSar } from '@/lib/format-money';
import { ActionDialog } from '@/components/overlays/action-dialog';
import { AccountForm } from './new/account-form';
import { ACCOUNT_NAME_PRESETS } from '@/features/accounts/account-name-options';
import { BANK_OPTIONS } from '@/features/accounts/banks';
import { getEditableAccount } from '@/features/accounts/queries/get-editable-account';
import { SmartComboInput } from '@/components/forms/smart-combo-input';
import { deactivateAccountAction, updateAccountAction } from './actions';
import { reconcileConfirmedOnboardingAccounts } from '@/lib/conversations/onboarding-account-reconciliation';
import { LucideIcon } from '@/components/ui/lucide-icon';

const labels={BANK:'حساب جاري',SAVINGS:'ادخار',CASH:'نقدي',OTHER:'أخرى'} as const;

export default async function AccountsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams;
  const user=await requireAuthenticatedUser();
  await reconcileConfirmedOnboardingAccounts(user.id);
  const accounts=await listAccounts(user.id,true);
  const active=accounts.filter(a=>a.isActive);
  const inactive=accounts.filter(a=>!a.isActive);
  const editableEntries=await Promise.all(active.map(async a=>[a.id,await getEditableAccount(user.id,a.id)] as const));
  const editable=new Map(editableEntries);
  const accountNames=[...new Set([...ACCOUNT_NAME_PRESETS,...accounts.map(a=>a.name)])];
  const bankNames=[...new Set([...BANK_OPTIONS.map(b=>b.name),...accounts.map(a=>a.bankName).filter((v):v is string=>Boolean(v))])];
  const total=sumMoney(active.map(a=>Money.parse(a.balance)));

  return <main className="v2-page v2-accounts" dir="rtl">
    <section className="v2-page-hero v2-accounts-hero">
      <div>
        <span className="v2-hero-kicker">إدارة أموالك ونموها</span>
        <h1>الحسابات</h1>
        <p>تابع سيولتك وحساباتك البنكية والمحافظ من شاشة واحدة واضحة.</p>
      </div>
      <ActionDialog title="إضافة حساب" description="أدخل بيانات الحساب دون مغادرة الصفحة." size="lg" triggerClassName="v2-primary" trigger="إضافة حساب" defaultOpen={query.action==='add'}>
        <AccountForm accountNames={accountNames} bankNames={bankNames}/>
      </ActionDialog>
    </section>

    <section className="v2-page-body">
      <section className="v2-account-summary">
        <article>
          <span className="v2-account-summary-icon"><LucideIcon name="walletCards" size={24}/></span>
          <div><span>إجمالي السيولة</span><strong>{formatSar(total)}</strong><small>الرصيد الفعلي في الحسابات النشطة</small></div>
        </article>
        <article>
          <span className="v2-account-summary-icon is-gold"><LucideIcon name="landmark" size={24}/></span>
          <div><span>الحسابات النشطة</span><strong>{active.length}</strong><small>حساب ومحفظة متاحة الآن</small></div>
        </article>
        <article>
          <span className="v2-account-summary-icon"><LucideIcon name="circleCheck" size={24}/></span>
          <div><span>الحالة</span><strong>{active.length?'جاهزة':'تحتاج إعدادًا'}</strong><small>{inactive.length?inactive.length+' حساب غير نشط':'لا توجد حسابات معطلة'}</small></div>
        </article>
      </section>

      <section className="v2-accounts-section">
        <header className="v2-section-title">
          <div><span className="v2-section-kicker">حساباتك</span><h2>الحسابات النشطة</h2><p>كل حساب ظاهر في بطاقة مستقلة بحدود واضحة.</p></div>
        </header>

        {active.length===0 ? (
          <article className="v2-empty-card">
            <span className="v2-empty-icon"><LucideIcon name="landmark" size={32}/></span>
            <h2>لا توجد حسابات نشطة</h2>
            <p>أضف حسابك الأول لبدء متابعة الرصيد والحركات المالية.</p>
            <ActionDialog title="إضافة أول حساب" size="xl" triggerClassName="v2-primary" trigger="إضافة أول حساب">
              <AccountForm accountNames={accountNames} bankNames={bankNames}/>
            </ActionDialog>
          </article>
        ) : (
          <div className="v2-account-grid">
            {active.map((account,index)=>{
              const a=editable.get(account.id);
              return <article className="v2-account-card" data-tone={index%3} key={account.id}>
                <header>
                  <span className="v2-account-icon"><LucideIcon name={account.accountType==='CASH'?'banknote':'creditCard'} size={24}/></span>
                  <div><span>{labels[account.accountType]}</span><h3>{account.name}</h3><small>{account.bankName??'بدون جهة محددة'}{account.cardLast4?' · •••• '+account.cardLast4:''}</small></div>
                </header>
                <div className="v2-account-balance"><span>الرصيد الحالي</span><strong>{formatSar(account.balance)}</strong></div>
                <div className="v2-account-actions">
                  <ActionDialog title={'تفاصيل '+account.name} trigger="التفاصيل">
                    <div className="v2-detail-list">
                      <div><span>النوع</span><strong>{labels[account.accountType]}</strong></div>
                      <div><span>البنك أو الجهة</span><strong>{account.bankName??'—'}</strong></div>
                      <div><span>آخر البطاقة</span><strong>{account.cardLast4?'•••• '+account.cardLast4:'—'}</strong></div>
                      <div><span>الرصيد</span><strong>{formatSar(account.balance)}</strong></div>
                    </div>
                  </ActionDialog>
                  {a ? <ActionDialog title={'تعديل '+account.name} size="lg" trigger="تعديل">
                    <form className="v2-form-grid" action={updateAccountAction}>
                      <input type="hidden" name="accountId" value={a.id}/><input type="hidden" name="returnTo" value="/accounts"/>
                      <label>اسم الحساب<SmartComboInput name="name" options={[...ACCOUNT_NAME_PRESETS]} defaultValue={a.name} placeholder="اختر أو اكتب اسم الحساب" ariaLabel="اسم الحساب"/></label>
                      <label>البنك أو الجهة<SmartComboInput name="bankName" options={BANK_OPTIONS.map(b=>b.name)} defaultValue={a.bankName} placeholder="اختر أو اكتب اسم البنك" ariaLabel="البنك أو الجهة"/></label>
                      <label>الرصيد الافتتاحي<input name="openingBalance" inputMode="decimal" defaultValue={a.openingBalance} required/></label>
                      <label>تاريخ الرصيد<input name="effectiveDate" type="date" defaultValue={a.effectiveDate} required/></label>
                      <label>آخر 4 أرقام<input name="cardLast4" inputMode="numeric" maxLength={4} defaultValue={a.cardLast4}/></label>
                      <button className="v2-primary" type="submit">حفظ التعديلات</button>
                    </form>
                  </ActionDialog> : null}
                  <ActionDialog title={'تعطيل '+account.name} description="سيبقى تاريخ الحساب محفوظًا ولن يحذف." size="sm" trigger="تعطيل">
                    <form action={deactivateAccountAction}><button className="v2-danger" type="submit">تأكيد التعطيل</button></form>
                  </ActionDialog>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>

      {inactive.length ? <details className="v2-inactive-accounts">
        <summary>الحسابات غير النشطة ({inactive.length})</summary>
        <div>{inactive.map(a=><article key={a.id}><div><strong>{a.name}</strong><span>{a.bankName??labels[a.accountType]}</span></div><b>{formatSar(a.balance)}</b></article>)}</div>
      </details> : null}
    </section>
  </main>;
}
