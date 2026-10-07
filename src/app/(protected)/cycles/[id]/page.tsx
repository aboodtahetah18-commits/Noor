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
    <main className="foundation-page p47-closure-page namaa-cycle-detail-page" dir="rtl">
      <section className="foundation-card namaa-cycle-detail-card">
        <header className="namaa-cycle-detail-head">
          <p className="eyebrow">الدورة المالية</p>
          <h1>{cycle.name}</h1>
        </header>

        <div className="namaa-cycle-detail-grid">
          <div className="namaa-cycle-detail-dates">
            <article>
              <span>البداية</span>
              <strong>{formatFinancialDate(cycle.startDate)}</strong>
            </article>
            <article>
              <span>الدخل القادم</span>
              <strong>{formatFinancialDate(cycle.expectedNextIncomeDate)}</strong>
            </article>
          </div>

          <nav className="namaa-cycle-detail-links" aria-label="إجراءات الدورة">
            <a href={`/cycles/${cycle.id}/income`}>إدارة الدخل المتوقع</a>
            <a href={`/cycles/${cycle.id}/forecast`}>خطة السيولة حتى الراتب القادم</a>
            {cycle.status === 'ACTIVE' ? <a href={`/income/new?cycleId=${cycle.id}`}>تسجيل دخل فعلي</a> : null}
            {cycle.status === 'CLOSING' ? <a href={`/cycles/${cycle.id}/review`}>مراجعة الدورة واعتمادها ثم إنشاء الدورة القادمة</a> : null}
          </nav>
        </div>

        <div className="namaa-cycle-detail-actions">
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

          {cycle.status === 'CLOSING' ? <span className="namaa-cycle-status-note">الدورة في وضع الإغلاق. العمليات المالية العادية متوقفة.</span> : null}

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
        </div>
      </section>

      <FocusedNextStep href={`/cycles/${cycle.id}/forecast`} title="التالي: خطة السيولة" description=""/>
    </main>
  );
}
