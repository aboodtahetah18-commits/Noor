import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { Money, sumMoney } from '@/financial-engine/money';
import { formatSar } from '@/lib/format-money';
import { ActionDialog } from '@/components/overlays/action-dialog';
import { AccountForm } from './new/account-form';
import { AccountDetailsFlow } from './account-details-flow';
import { ACCOUNT_NAME_PRESETS } from '@/features/accounts/account-name-options';
import { BANK_OPTIONS } from '@/features/accounts/banks';
import { getEditableAccount } from '@/features/accounts/queries/get-editable-account';
import { FocusedNextStep } from '@/components/ux/focused-next-step';
import { EntityActionRail } from '@/components/ui/entity-actions';
import { LucideIcon } from '@/components/ui/lucide-icon';
import Image from 'next/image';
import { reconcileConfirmedOnboardingAccounts } from '@/lib/conversations/onboarding-account-reconciliation';
import { getAccountActivitySummaries } from '@/features/accounts/queries/get-account-activity-summaries';

const labels = { BANK: 'حساب جاري', SAVINGS: 'ادخار', CASH: 'نقدي', OTHER: 'أخرى' } as const;

function sarNumber(value: string | Money): string {
  return formatSar(value).replace(/\s*\u20C1$/u, '');
}

function SarAmount({ value }: { value: string | Money }) {
  return <span className="namaa-money-value"><Image src="/brand/saudi-riyal-symbol.png" alt="" width={18} height={18} unoptimized/><span>{sarNumber(value)}</span></span>;
}

function displayAccountName(name: string): string {
  return name.replace(/\s*\(\d+\)\s*$/u, '').trim();
}

function bankToneClass(name?: string | null): string {
  const value = String(name ?? '').toLowerCase();
  if (value.includes('الإنماء') || value.includes('alinma')) return 'is-bank-alinma';
  if (value.includes('ميم') || value.includes('meem')) return 'is-bank-meem';
  if (value.includes('البلاد')) return 'is-bank-albilad';
  if (value.includes('الراجحي')) return 'is-bank-alrajhi';
  if (value.includes('الأهلي')) return 'is-bank-snb';
  if (value.includes('الرياض')) return 'is-bank-riyad';
  if (value.includes('الأول') || value.includes('sab')) return 'is-bank-sab';
  if (value.includes('العربي')) return 'is-bank-anb';
  if (value.includes('الفرنسي')) return 'is-bank-bsf';
  if (value.includes('الاستثمار')) return 'is-bank-saib';
  if (value.includes('الجزيرة')) return 'is-bank-aljazira';
  if (value.includes('stc')) return 'is-bank-stc';
  if (value.includes('d360')) return 'is-bank-d360';
  return 'is-bank-default';
}

export default async function AccountsPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const query = await searchParams;
  const user = await requireAuthenticatedUser();
  await reconcileConfirmedOnboardingAccounts(user.id);
  const [accounts, activitySummaries] = await Promise.all([
    listAccounts(user.id, true),
    getAccountActivitySummaries(user.id),
  ]);
  const activityByAccount = new Map(activitySummaries.map((item) => [item.accountId, item]));
  const active = accounts.filter((a) => a.isActive);
  const inactive = accounts.filter((a) => !a.isActive);
  const editableEntries = await Promise.all(active.map(async (a) => [a.id, await getEditableAccount(user.id, a.id)] as const));
  const editable = new Map(editableEntries);
  const accountNames = [...new Set([...ACCOUNT_NAME_PRESETS, ...accounts.map((a) => displayAccountName(a.name))])];
  const bankNames = [...new Set([...BANK_OPTIONS.map((b) => b.name), ...accounts.map((a) => a.bankName).filter((v): v is string => Boolean(v))])];
  const total = sumMoney(active.map((a) => Money.parse(a.balance)));

  return <main className="page-shell p47-resource-page namaa-accounts-page" dir="rtl">
    <section className="p74-focus-summary namaa-accounts-summary namaa-accounts-overview"><div><span>إجمالي السيولة الفعلية</span><strong><SarAmount value={total}/></strong><small>{active.length} حساب نشط</small></div><ActionDialog title="إضافة حساب" description="أدخل بيانات الحساب دون مغادرة الصفحة." size="lg" presentation="page" triggerClassName="primary-link" trigger={<span className="namaa-action-label"><LucideIcon name="plus" size={20}/><span>إضافة حساب</span></span>} defaultOpen={query.action==='add'}><AccountForm accountNames={accountNames} bankNames={bankNames}/></ActionDialog></section>

    {active.length===0?<section className="p47-empty-state"><strong>لا توجد حسابات نشطة</strong><span>أضف حسابك الأول لبدء تسجيل الحركات المالية.</span><ActionDialog title="إضافة أول حساب" size="xl" presentation="page" triggerClassName="primary-link" trigger="إضافة أول حساب"><AccountForm accountNames={accountNames} bankNames={bankNames}/></ActionDialog></section>:<>
<section className="p47-resource-card namaa-wide-only namaa-collection-card"><div className="namaa-collection-head"><div><h2>الحسابات النشطة</h2></div><ActionDialog title="إضافة حساب" description="أدخل بيانات الحساب ثم أكّد الإضافة ليظهر مباشرة في الجدول." size="xl" presentation="page" triggerClassName="primary-link" trigger={<span className="namaa-action-label"><LucideIcon name="plus" size={20}/><span>إضافة حساب</span></span>}><AccountForm accountNames={accountNames} bankNames={bankNames}/></ActionDialog></div>
<div className="namaa-table-wrap"><table className="namaa-data-table"><thead><tr><th>اسم الحساب</th><th>النوع</th><th>البنك/الجهة</th><th>آخر البطاقة</th><th>الرصيد الحالي</th><th>الإجراءات</th></tr></thead><tbody>{active.map(account=>{const a=editable.get(account.id);const displayName=displayAccountName(account.name);const activity=activityByAccount.get(account.id)??null;return <tr key={account.id}><td><strong>{displayName}</strong></td><td>{labels[account.accountType]}</td><td>{account.bankName??'—'}</td><td>{account.cardLast4?`•••• ${account.cardLast4}`:'—'}</td><td><strong><SarAmount value={account.balance}/></strong></td><td><EntityActionRail print={false}><ActionDialog title={`تفاصيل ${displayName}`} size="xl" presentation="page" printable={false} trigger={<span className="namaa-action-label"><LucideIcon name="eye" size={20}/><span>عرض التفاصيل</span></span>} triggerAriaLabel={`عرض تفاصيل ${displayName}`}><AccountDetailsFlow account={{id:account.id,name:displayName,accountType:account.accountType,bankName:account.bankName??'',cardLast4:account.cardLast4??'',balanceText:sarNumber(account.balance)}} editable={a?{id:a.id,name:displayAccountName(a.name),bankName:a.bankName,openingBalance:a.openingBalance,effectiveDate:a.effectiveDate,iban:a.iban}:null} accountNames={accountNames} bankNames={bankNames} activity={activity}/></ActionDialog></EntityActionRail></td></tr>})}</tbody></table></div></section>
<section className="p47-resource-card namaa-mobile-only namaa-accounts-mobile-card"><div className="p47-account-map">{active.map(account=>{const a=editable.get(account.id);const displayName=displayAccountName(account.name);const activity=activityByAccount.get(account.id)??null;return <article className={`p47-account-tile namaa-account-card ${bankToneClass(account.bankName)}`} key={account.id}><div className="namaa-account-copy"><span className="p47-account-type">{labels[account.accountType]}</span><h3>{displayName}</h3><small className="namaa-account-bank-line"><span className="namaa-bank-name">{account.bankName??'بدون جهة محددة'}</span>{account.cardLast4?<span className="namaa-card-last4">{` · •••• ${account.cardLast4}`}</span>:null}</small></div><div className="namaa-account-balance-block"><span>الرصيد الحالي</span><strong><SarAmount value={account.balance}/></strong></div><EntityActionRail print={false}><ActionDialog title={`تفاصيل ${displayName}`} size="xl" presentation="page" printable={false} trigger={<span className="namaa-action-label"><LucideIcon name="eye" size={20}/><span>عرض التفاصيل</span></span>} triggerAriaLabel={`عرض تفاصيل ${displayName}`}><AccountDetailsFlow account={{id:account.id,name:displayName,accountType:account.accountType,bankName:account.bankName??'',cardLast4:account.cardLast4??'',balanceText:sarNumber(account.balance)}} editable={a?{id:a.id,name:displayAccountName(a.name),bankName:a.bankName,openingBalance:a.openingBalance,effectiveDate:a.effectiveDate,iban:a.iban}:null} accountNames={accountNames} bankNames={bankNames} activity={activity}/></ActionDialog></EntityActionRail></article>})}</div></section></>}

    {inactive.length?<details className="p74-secondary-disclosure"><summary>الحسابات غير النشطة ({inactive.length})</summary><section className="p47-resource-card"><div className="p47-compact-list">{inactive.map(a=><div key={a.id}><div><strong>{displayAccountName(a.name)}</strong><span>{a.bankName??labels[a.accountType]}</span></div><ActionDialog title={`تفاصيل ${displayAccountName(a.name)}`} trigger="عرض"><div className="detail-list"><div><span>الحالة</span><strong>غير نشط</strong></div><div><span>الرصيد</span><strong><SarAmount value={a.balance}/></strong></div></div></ActionDialog></div>)}</div></section></details>:null}<FocusedNextStep href="/bank-operations" title="انتقل إلى التشغيل البنكي" description="بعد ضبط الحسابات، راجع الرسائل والحركات البنكية اليومية المرتبطة بها."/>
  </main>;
}
