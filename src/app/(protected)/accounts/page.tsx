import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { Money, sumMoney } from '@/financial-engine/money';
import { formatSar } from '@/lib/format-money';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { reconcileConfirmedOnboardingAccounts } from '@/lib/conversations/onboarding-account-reconciliation';

const types={
  BANK:{label:'البنوك',icon:'landmark'},
  SAVINGS:{label:'الادخار',icon:'banknote'},
  CASH:{label:'المحافظ',icon:'walletCards'},
  OTHER:{label:'أخرى',icon:'ellipsis'},
} as const;

export default async function AccountsPage({searchParams}:{searchParams:Promise<{type?:string}>}){
  const q=await searchParams;
  const user=await requireAuthenticatedUser();
  await reconcileConfirmedOnboardingAccounts(user.id);
  const accounts=await listAccounts(user.id,true);
  const active=accounts.filter(a=>a.isActive);
  const inactive=accounts.filter(a=>!a.isActive);
  const selected=q.type&&Object.prototype.hasOwnProperty.call(types,q.type)?q.type:'ALL';
  const filtered=selected==='ALL'?active:active.filter(a=>a.accountType===selected);
  const total=sumMoney(active.map(a=>Money.parse(a.balance)));

  return <main className="page-shell p47-resource-page namaa-approved-finance namaa-approved-accounts" dir="rtl">
    <header className="p47-resource-header namaa-approved-page-heading">
      <div><h1>الحسابات</h1></div><Link href="/accounts/new" className="namaa-approved-account-header-add"><LucideIcon name="plus" size={20}/> إضافة حساب</Link>
    </header>
    <section className="p74-focus-summary namaa-approved-accounts-balance">
      <span>إجمالي الرصيد الحالي</span>
      <strong>{formatSar(total)}</strong>
      <small>{active.length} حساب نشط</small>
      <LucideIcon name="walletCards" size={32}/>
    </section>
    <section className="namaa-approved-account-stats" aria-label="أنواع الحسابات">
      {(Object.entries(types) as Array<[keyof typeof types,(typeof types)[keyof typeof types]]>).map(([key,value])=><Link key={key} href={`/accounts?type=${key}`} className={selected===key?'is-selected':''}><LucideIcon name={value.icon} size={20}/><span>{value.label}</span><strong>{active.filter(a=>a.accountType===key).length}</strong></Link>)}
    </section>
    <nav className="namaa-approved-account-filters" aria-label="تصفية الحسابات">
      <Link href="/accounts" aria-current={selected==='ALL'?'page':undefined}>الكل</Link>
      {(Object.entries(types) as Array<[keyof typeof types,(typeof types)[keyof typeof types]]>).map(([key,value])=><Link key={key} href={`/accounts?type=${key}`} aria-current={selected===key?'page':undefined}>{value.label}</Link>)}
    </nav>
    <section className="namaa-approved-account-list" aria-label="الحسابات النشطة">
      {filtered.length?filtered.map(a=><article className="namaa-approved-account-row" key={a.id}>
        <div className="namaa-approved-account-icon"><LucideIcon name={a.accountType==='BANK'?'landmark':a.accountType==='SAVINGS'?'banknote':'walletCards'} size={24}/></div>
        <div className="namaa-approved-account-details">
          <strong>{a.name}</strong>
          <small>{a.bankName??types[a.accountType].label}{a.cardLast4?` · •••• ${a.cardLast4}`:''}</small>
          <b>{formatSar(a.balance)}</b>
        </div>
        <Link href={`/accounts/${a.id}`} className="namaa-approved-account-view" aria-label={`عرض تفاصيل ${a.name}`}><LucideIcon name="chevronLeft" size={20}/></Link>
      </article>):<div className="namaa-approved-banks-empty">لا توجد حسابات مطابقة. يمكنك تغيير التصنيف أو إضافة حساب جديد.</div>}
    </section>
    {inactive.length?<details className="namaa-approved-inactive"><summary>الحسابات غير النشطة ({inactive.length})</summary><div>{inactive.map(a=><Link key={a.id} href={`/accounts/${a.id}`}>{a.name}</Link>)}</div></details>:null}
  </main>;
}
