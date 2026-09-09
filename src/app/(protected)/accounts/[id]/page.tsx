import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getAccount } from '@/features/accounts/queries/get-account';
import { deactivateAccountAction } from '../actions';
import { formatSar } from '@/lib/format-money';
import { FocusedNextStep } from '@/components/ux/focused-next-step';

export default async function AccountDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuthenticatedUser();
  const account = await getAccount(user.id, id);
  if (!account) notFound();

  return (
    <main className="app-page" dir="rtl">
      <div className="page-shell narrow-shell p47-closure-page">
        <header className="page-header p47-closure-header">
          <div><p className="eyebrow">تفاصيل الحساب</p><div className="title-with-help"><h1>{account.name}</h1></div></div>
          <Link className="tertiary-link" href="/accounts">عودة</Link>
        </header>

        <section className="account-detail-hero"><span>الرصيد الحالي</span><strong>{formatSar(account.balance)}</strong></section>
        <section className="detail-list">
          <div><span>الرصيد الافتتاحي</span><strong>{formatSar(account.openingBalance)}</strong></div>
          <div><span>تاريخ الرصيد الافتتاحي</span><strong>{account.effectiveDate}</strong></div>
          <div><span>البنك/الجهة</span><strong>{account.bankName ?? '—'}</strong></div><div><span>رقم الحساب</span><strong>{account.accountNumberMasked ?? '—'}</strong></div><div><span>IBAN</span><strong>{account.ibanMasked ?? '—'}</strong></div><div><span>البطاقة المرتبطة</span><strong>{account.cardLast4 ? `•••• ${account.cardLast4}` : '—'}</strong></div><div><span>العملة</span><strong>ريال سعودي (SAR)</strong></div>
        </section>

        {account.isActive ? <details className="p74-secondary-disclosure"><summary>إدارة الحساب</summary><section className="danger-zone"><form action={deactivateAccountAction}><input type="hidden" name="accountId" value={account.id} /><button className="danger-button" type="submit">تعطيل الحساب</button></form></section></details> : null}
        <FocusedNextStep href="/bank-operations" title="التالي: العمليات البنكية" description=""/>
      </div>
    </main>
  );
}
