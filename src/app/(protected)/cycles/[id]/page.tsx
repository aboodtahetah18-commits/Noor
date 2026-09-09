import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getFinancialCycle } from '@/features/cycles/queries/get-cycle';
import { activateCycleAction, startCycleClosingAction } from '../actions';
import { ActionDialog } from '@/components/overlays/action-dialog';
import { formatFinancialDate } from '@/lib/format-date';
import { FocusedNextStep } from '@/components/ux/focused-next-step';

export default async function CyclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuthenticatedUser();
  const cycle = await getFinancialCycle(user.id, id);
  if (!cycle) notFound();

  return (
    <main className="foundation-page p47-closure-page" dir="rtl">
      <section className="foundation-card">
        <p className="eyebrow">الدورة المالية</p>
        <div className="title-with-help">
          <h1>{cycle.name}</h1>
          
        </div>
        <p>البداية: {formatFinancialDate(cycle.startDate)}</p>
        <p>الدخل القادم: {formatFinancialDate(cycle.expectedNextIncomeDate)}</p>
        <p><a href={`/cycles/${cycle.id}/income`}>إدارة الدخل المتوقع</a></p>
        <p><a href={`/cycles/${cycle.id}/forecast`}>خطة السيولة حتى الراتب القادم</a></p>
        {cycle.status === 'ACTIVE' ? <p><a href={`/income/new?cycleId=${cycle.id}`}>تسجيل دخل فعلي</a></p> : null}
        {cycle.status === 'ACTIVE' ? (
          <ActionDialog
            trigger="بدء إغلاق الدورة"
            title="تأكيد بدء إغلاق الدورة"
            size="sm"
            triggerClassName="secondary-button"
          >
            <form action={startCycleClosingAction}>
              <input type="hidden" name="cycleId" value={cycle.id} />
              <button className="danger-button" type="submit">تأكيد بدء الإغلاق</button>
            </form>
          </ActionDialog>
        ) : null}
        {cycle.status === 'CLOSING' ? (
          <>
            <p>الدورة في وضع الإغلاق. العمليات المالية العادية متوقفة.</p>
            <p><a href={`/cycles/${cycle.id}/review`}>مراجعة الدورة واعتمادها ثم إنشاء الدورة القادمة</a></p>
          </>
        ) : null}
        {cycle.status === 'DRAFT' ? (
          <ActionDialog
            trigger="تفعيل الدورة"
            title="تأكيد تفعيل الدورة"
            size="sm"
            triggerClassName="primary-button"
          >
            <form action={activateCycleAction}>
              <input type="hidden" name="cycleId" value={cycle.id} />
              <button className="primary-button" type="submit">تأكيد التفعيل</button>
            </form>
          </ActionDialog>
        ) : null}
      </section>
      <FocusedNextStep href={`/cycles/${cycle.id}/forecast`} title="التالي: خطة السيولة" description=""/>
    </main>
  );
}
