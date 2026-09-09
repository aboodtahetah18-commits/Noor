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
import { FocusedNextStep } from '@/components/ux/focused-next-step';
import { EntityActionRail } from '@/components/ui/entity-actions';

const labels = { BANK: 'حساب جاري', SAVINGS: 'ادخار', CASH: 'نقدي', OTHER: 'أخرى' } as const;

export default async function AccountsPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const query = await searchParams;
  const user = await requireAuthenticatedUser();
  const accounts = await listAccounts(user.id, true);
  const active = accounts.filter((a) => a.isActive);
  const inactive = accounts.filter((a) => !a.isActive);
  const editableEntries = await Promise.all(active.map(async (a) => [a.id, await getEditableAccount(user.id, a.id)] as const));
  const editable = new Map(editableEntries);
  const accountNames = [...new Set([...ACCOUNT_NAME_PRESETS, ...accounts.map((a) => a.name)])];
  const bankNames = [...new Set([...BANK_OPTIONS.map((b) => b.name), ...accounts.map((a) => a.bankName).filter((v): v is string => Boolean(v))])];
  const total = sumMoney(active.map((a) => Money.parse(a.balance)));

  return <main className="page-shell p47-resource-page" dir="rtl">
    <header className="p47-resource-header"><div><p className="eyebrow">إدارة السيولة</p><div className="title-with-help"><h1>الحسابات</h1></div><p>أماكن وجود أموالك الفعلية، منفصلة عن الميزانية والمبالغ المحجوزة.</p></div><ActionDialog title="إضافة حساب" description="أدخل بيانات الحساب دون مغادرة الصفحة." size="lg" triggerClassName="primary-link" trigger="إضافة حساب" defaultOpen={query.action==='add'}><AccountForm accountNames={accountNames} bankNames={bankNames}/></ActionDialog></header>

    <section className="p74-focus-summary"><div><span>إجمالي السيولة الفعلية</span><strong>{formatSar(total)}</strong><small>{active.length} حساب نشط · هذه الصفحة للحسابات فقط، وليست لتحليل الميزانية أو الصرف.</small></div></section>

    {active.length===0?<section className="p47-empty-state"><strong>لا توجد حسابات نشطة</strong><span>أضف حسابك الأول لبدء تسجيل الحركات المالية.</span><ActionDialog title="إضافة أول حساب" size="lg" triggerClassName="primary-link" trigger="إضافة أول حساب"><AccountForm accountNames={accountNames} bankNames={bankNames}/></ActionDialog></section>:<section className="p47-resource-card"><div className="p47-section-heading"><div><span>Liquidity Map</span><h2>الحسابات النشطة</h2></div><small>اضغط على أي حساب لعرض التفاصيل</small></div><div className="p47-account-map">{active.map(account=>{const a=editable.get(account.id);return <article className="p47-account-tile" key={account.id}><div><span className="p47-account-type">{labels[account.accountType]}</span><h3>{account.name}</h3><small>{account.bankName??'بدون جهة محددة'}{account.cardLast4?` · •••• ${account.cardLast4}`:''}</small></div><div><span>الرصيد الحالي</span><strong>{formatSar(account.balance)}</strong></div><EntityActionRail print={true}><ActionDialog title={`تفاصيل ${account.name}`} trigger="عرض التفاصيل"><div className="detail-list"><div><span>النوع</span><strong>{labels[account.accountType]}</strong></div><div><span>البنك/الجهة</span><strong>{account.bankName??'—'}</strong></div><div><span>آخر البطاقة</span><strong>{account.cardLast4?`•••• ${account.cardLast4}`:'—'}</strong></div><div><span>الرصيد الحالي</span><strong>{formatSar(account.balance)}</strong></div></div></ActionDialog>{a?<ActionDialog title={`تعديل ${account.name}`} size="lg" trigger="تعديل"><form className="form-grid" action={updateAccountAction}><input type="hidden" name="accountId" value={a.id}/><input type="hidden" name="returnTo" value="/accounts"/><label>اسم الحساب<SmartComboInput name="name" options={[...ACCOUNT_NAME_PRESETS]} defaultValue={a.name} placeholder="اختر أو اكتب اسم الحساب" ariaLabel="اسم الحساب"/></label><label>البنك أو الجهة<SmartComboInput name="bankName" options={BANK_OPTIONS.map((b)=>b.name)} defaultValue={a.bankName} placeholder="اختر أو اكتب اسم البنك" ariaLabel="البنك أو الجهة"/></label><label>الرصيد الافتتاحي<input name="openingBalance" inputMode="decimal" defaultValue={a.openingBalance} required/></label><label>تاريخ الرصيد<input name="effectiveDate" type="date" defaultValue={a.effectiveDate} required/></label><label>IBAN<input name="iban" dir="ltr" defaultValue={a.iban}/></label><label>آخر 4 أرقام<input name="cardLast4" inputMode="numeric" maxLength={4} defaultValue={a.cardLast4}/></label><button className="primary-button" type="submit">حفظ التعديلات</button></form></ActionDialog>:null}<ActionDialog title={`تعطيل ${account.name}`} description="سيبقى تاريخ الحساب محفوظًا ولن يحذف." size="sm" trigger="تعطيل"><form action={deactivateAccountAction}><input type="hidden" name="accountId" value={account.id}/><div className="p49-dialog-actions"><button className="danger-button" type="submit">تأكيد التعطيل</button></div></form></ActionDialog></EntityActionRail></article>})}</div></section>}

    {inactive.length?<details className="p74-secondary-disclosure"><summary>الحسابات غير النشطة ({inactive.length})</summary><section className="p47-resource-card"><div className="p47-compact-list">{inactive.map(a=><div key={a.id}><div><strong>{a.name}</strong><span>{a.bankName??labels[a.accountType]}</span></div><ActionDialog title={`تفاصيل ${a.name}`} trigger="عرض"><div className="detail-list"><div><span>الحالة</span><strong>غير نشط</strong></div><div><span>الرصيد</span><strong>{formatSar(a.balance)}</strong></div></div></ActionDialog></div>)}</div></section></details>:null}<FocusedNextStep href="/bank-operations" title="انتقل إلى التشغيل البنكي" description="بعد ضبط الحسابات، راجع الرسائل والحركات البنكية اليومية المرتبطة بها."/>
  </main>;
}
