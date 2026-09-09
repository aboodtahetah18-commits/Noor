import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getDailyBankOperationsCenter } from '@/features/bank-operations/queries/get-daily-bank-operations-center';
import { getCurrentFinancialCycle } from '@/features/cycles/queries/get-current-cycle';
import { BankMessageDialogTrigger } from '@/components/bank-message-dialog';

export default async function WorkspacePage(){
  const user = await requireAuthenticatedUser();
  const [cycle, bank] = await Promise.all([
    getCurrentFinancialCycle(user.id),
    getDailyBankOperationsCenter(user.id),
  ]);

  const needsDecision = bank.pendingReviewCount > 0 || bank.duplicateCandidatesCount > 0 || bank.unclassifiedCount > 0;
  const primaryNext = !cycle
    ? { href:'/cycles/new', title:'ابدأ دورة مالية' }
    : needsDecision
      ? { href:'/bank-operations', title:'راجع العمليات البنكية' }
      : { href:'/dashboard', title:'العودة للوحة القيادة' };

  return <main className="app-page p76-focus-page" dir="rtl"><div className="page-shell dashboard-shell p47-closure-page">
    <header className="dashboard-header">
      <div><p className="eyebrow">مركز النظام</p><h1>الإجراء التالي</h1></div>
      <BankMessageDialogTrigger className="primary-link">رسالة بنكية</BankMessageDialogTrigger>
    </header>

    <section className="workspace-next-action" aria-label="الإجراء التالي">
      <div><strong>{primaryNext.title}</strong></div>
      <Link className="primary-link" href={primaryNext.href}>فتح</Link>
    </section>

    <div className="p74-inline-metrics">
      <span>تحتاج قرارك <b>{bank.pendingReviewCount}</b></span>
      <span>مكررات <b>{bank.duplicateCandidatesCount}</b></span>
      <span>بدون بند <b>{bank.unclassifiedCount}</b></span>
    </div>

    <details className="p74-secondary-disclosure">
      <summary>بقية الوحدات</summary>
      <div className="p76-route-grid">
        <Link href="/transactions">السجل المالي</Link>
        <Link href="/budget">الميزانية</Link>
        <Link href="/goals">الأهداف</Link>
        <Link href="/advisor">المستشار المالي</Link>
        <Link href="/reports">التقارير</Link>
        <Link href="/settings">الإعدادات</Link>
      </div>
    </details>
  </div></main>;
}
