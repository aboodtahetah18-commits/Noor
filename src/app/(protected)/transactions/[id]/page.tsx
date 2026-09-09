import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getTransactionDetails } from '@/features/transactions/queries/get-transaction-details';
import { reverseTransactionAction } from '../actions';
import { randomUUID } from 'node:crypto';
import { FocusedNextStep } from '@/components/ux/focused-next-step';
import { PrintButton } from '@/components/ui/print-button';

const TYPE_LABELS: Record<string,string> = {INCOME:'دخل',EXPENSE:'مصروف',TRANSFER:'تحويل',REFUND:'استرداد',SAVING_TRANSFER:'تحويل للادخار',EMERGENCY_CONTRIBUTION:'مساهمة طوارئ',EMERGENCY_WITHDRAWAL:'سحب طارئ',GOAL_CONTRIBUTION:'مساهمة هدف',OBLIGATION_PAYMENT:'سداد التزام'};
const STATUS_LABELS: Record<string,string> = {PENDING:'قيد التنفيذ',POSTED:'منشورة',REVERSED:'معكوسة',FAILED:'فاشلة'};

export default async function TransactionDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;
  const query = await searchParams;
  const reversed = query.reversed === '1';
  const transaction = await getTransactionDetails(user.id,id);
  if (!transaction) notFound();
  return <main className="page-shell narrow-shell p47-closure-page" dir="rtl">
    <header className="page-header p47-closure-header"><div><p className="eyebrow">تفاصيل العملية</p><h1>{TYPE_LABELS[transaction.transactionType] ?? transaction.transactionType}</h1></div><div className="mx-entity-actions"><PrintButton className="mx-action-chip"/><Link className="tertiary-link" href="/transactions">العودة للسجل</Link></div></header>
    {reversed ? <section className="card success-card"><strong>تم عكس العملية بنجاح.</strong><p className="muted">تم الاحتفاظ بالأصل في السجل وإلغاء أثره المالي.</p></section> : null}
    <section className="account-detail-hero"><span>المبلغ</span><strong>{transaction.amount} ريال</strong><small>{transaction.transactionDate} · {STATUS_LABELS[transaction.status] ?? transaction.status}</small></section>
    <section className="detail-list">
      <div><span>نوع العملية</span><strong>{TYPE_LABELS[transaction.transactionType] ?? transaction.transactionType}</strong></div>
      <div><span>الحالة</span><strong>{STATUS_LABELS[transaction.status] ?? transaction.status}</strong></div>
      <div><span>الحساب</span><strong>{transaction.accountName ?? '—'}</strong></div>
      <div><span>البند</span><strong>{transaction.categoryName ?? '—'}</strong></div>
      <div><span>الدورة</span><strong>{transaction.cycleName ?? '—'}</strong></div>
      <div><span>الوصف</span><strong>{transaction.description ?? '—'}</strong></div>
      {transaction.incomeSourceName ? <div><span>مصدر الدخل</span><strong>{transaction.incomeSourceName}</strong></div> : null}
      {transaction.planningStatus ? <div><span>حالة التخطيط</span><strong>{transaction.planningStatus==='PLANNED'?'مخطط':'غير مخطط'}</strong></div> : null}
      <div><span>وقت التسجيل</span><strong>{transaction.createdAt}</strong></div>
      <div><span>وقت النشر</span><strong>{transaction.postedAt ?? '—'}</strong></div>
      {transaction.reversedAt ? <div><span>وقت العكس</span><strong>{transaction.reversedAt}</strong></div> : null}
      {transaction.reversalReason ? <div><span>سبب العكس</span><strong>{transaction.reversalReason}</strong></div> : null}
      {transaction.relatedTransactionId ? <div><span>العملية الأصلية</span><strong><Link href={`/transactions/${transaction.relatedTransactionId}`}>عرض العملية المرتبطة</Link></strong></div> : null}
      {transaction.obligation ? <div><span>الالتزام</span><strong><Link href={`/obligations/${transaction.obligation.id}/pay`}>{transaction.obligation.name} · {transaction.obligation.dueDate}</Link></strong></div> : null}
    </section>
    {transaction.status === 'POSTED' && ['INCOME','EXPENSE'].includes(transaction.transactionType) ? <details className="p74-secondary-disclosure"><summary>تصحيح العملية</summary><section className="form-card danger-zone"><p className="muted">يحافظ العكس على العملية الأصلية في السجل ويُلغي أثرها المالي.</p><form action={reverseTransactionAction}>
        <input type="hidden" name="transactionId" value={transaction.id} />
        <input type="hidden" name="idempotencyKey" value={`reverse-${randomUUID()}`} />
        <label>سبب العكس<textarea name="reason" required minLength={3} maxLength={500} placeholder="مثال: تم تسجيل العملية على الحساب الخطأ" /></label>
        <button className="danger-button" type="submit">عكس العملية</button>
      </form></section></details> : null}
    <FocusedNextStep href="/transactions" title="العودة إلى السجل المالي" description=""/>
  </main>;
}
