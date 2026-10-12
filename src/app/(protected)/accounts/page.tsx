import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { Money, sumMoney } from '@/financial-engine/money';
import { SaudiAmount } from '@/components/ui/saudi-amount';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { reconcileConfirmedOnboardingAccounts } from '@/lib/conversations/onboarding-account-reconciliation';

const accountTypes = {
  BANK: { label: 'البنوك', icon: 'landmark' },
  SAVINGS: { label: 'الادخار', icon: 'banknote' },
  CASH: { label: 'المحافظ', icon: 'walletCards' },
  OTHER: { label: 'أخرى', icon: 'ellipsis' },
} as const;

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const user = await requireAuthenticatedUser();
  await reconcileConfirmedOnboardingAccounts(user.id);
  const accounts = await listAccounts(user.id, true);
  const active = accounts.filter((account) => account.isActive);
  const inactive = accounts.filter((account) => !account.isActive);
  const selected = params.type && Object.prototype.hasOwnProperty.call(accountTypes, params.type)
    ? params.type
    : 'ALL';
  const visible = selected === 'ALL' ? active : active.filter((account) => account.accountType === selected);
  const total = sumMoney(active.map((account) => Money.parse(account.balance)));

  return (
    <div className="namaa-v2" dir="rtl">
      <header className="namaa-v2__header">
        <h1>الحسابات</h1>
        <Link href="/accounts/new" className="namaa-v2__primary">
          <LucideIcon name="plus" size={20} /> إضافة حساب
        </Link>
      </header>

      <section className="namaa-v2__balance" aria-label="ملخص الرصيد">
        <span className="namaa-v2__balance-label">إجمالي الرصيد الحالي</span>
        <strong className="namaa-v2__balance-value"><SaudiAmount value={total} /></strong>
        <span className="namaa-v2__balance-count">{active.length} حساب نشط</span>
      </section>

      <nav className="namaa-v2__filters" aria-label="تصفية الحسابات">
        <Link className="namaa-v2__chip" href="/accounts" aria-current={selected === 'ALL' ? 'page' : undefined}>
          الكل ({active.length})
        </Link>
        {(Object.entries(accountTypes) as Array<[keyof typeof accountTypes, (typeof accountTypes)[keyof typeof accountTypes]]>).map(([key, type]) => (
          <Link key={key} className="namaa-v2__chip" href={`/accounts?type=${key}`} aria-current={selected === key ? 'page' : undefined}>
            {type.label} ({active.filter((account) => account.accountType === key).length})
          </Link>
        ))}
      </nav>

      <section className="namaa-v2__list" aria-label="الحسابات النشطة">
        {visible.length === 0 ? (
          <div className="namaa-v2__empty">لا توجد حسابات مطابقة. يمكنك تغيير التصفية أو إضافة حساب جديد.</div>
        ) : visible.map((account) => (
          <Link className="namaa-v2__account" href={`/accounts/${account.id}`} key={account.id}>
            <span className="namaa-v2__account-icon">
              <LucideIcon name={account.accountType === 'BANK' ? 'landmark' : account.accountType === 'SAVINGS' ? 'banknote' : 'walletCards'} size={20} />
            </span>
            <span className="namaa-v2__account-details">
              <strong>{account.name}</strong>
              <small>{account.bankName ?? accountTypes[account.accountType].label}{account.cardLast4 ? ` · •••• ${account.cardLast4}` : ''}</small>
            </span>
            <span className="namaa-v2__account-amount"><SaudiAmount value={account.balance} /></span>
          </Link>
        ))}
      </section>

      {inactive.length > 0 ? (
        <details className="namaa-v2__inactive">
          <summary>الحسابات غير النشطة ({inactive.length})</summary>
          <div className="namaa-v2__inactive-links">
            {inactive.map((account) => (
              <Link href={`/accounts/${account.id}`} key={account.id}>{account.name}</Link>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
