import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { PILOT_2026 } from '@/config/pilot-2026';
import { getPilotDashboard, type PilotDecisionTrace } from '@/features/pilot/queries/get-pilot-dashboard';

function daysRemaining(end: string): number {
  const endDate = new Date(`${end}T23:59:59+03:00`).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((endDate - now) / 86_400_000));
}

function money(value: string | null, currency = 'SAR'): string {
  if (value == null) return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function score(value: string | null): string {
  if (value == null) return '—';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : value;
}

function stateLabel(value: string | null): string {
  if (!value) return 'لم يُحسب بعد';
  const labels: Record<string, string> = {
    CRITICAL: 'حرجة',
    VULNERABLE: 'هشة',
    BALANCED: 'متوازنة',
    STABLE: 'مستقرة',
    STRONG: 'قوية',
  };
  return labels[value] ?? value;
}

function decisionLabel(value: string | null): string {
  if (!value) return 'لم يُتخذ قرار';
  const labels: Record<string, string> = {
    APPROVE: 'اعتماد',
    REJECT: 'رفض',
    DEFER: 'تأجيل',
    MODIFY: 'طلب تعديل',
  };
  return labels[value] ?? value;
}

function executionLabel(item: PilotDecisionTrace): string {
  if (item.verifiedExecution) return 'تنفيذ متحقق';
  if (item.executionEventId) return `تم الإبلاغ: ${item.executionEventStatus ?? 'قيد التحقق'}`;
  if (item.executionTaskId) return `بانتظار المستخدم: ${item.executionTaskStatus ?? 'مفتوح'}`;
  if (item.userDecisionAction === 'REJECT') return 'لا يوجد تنفيذ — القرار مرفوض';
  if (item.userDecisionAction === 'DEFER') return 'لا يوجد تنفيذ — القرار مؤجل';
  return 'لم يصل للتنفيذ';
}

export default async function PilotPage() {
  const user = await requireAuthenticatedUser();
  const remaining = daysRemaining(PILOT_2026.endsAt);
  const pilot = await getPilotDashboard(user.id, PILOT_2026.startsAt, PILOT_2026.endsAt);
  const latest = pilot.latest;

  return (
    <main className="ux-page-shell" dir="rtl">
      <section className="ux-card" aria-labelledby="pilot-title">
        <div className="ux-page-header">
          <div>
            <p className="ux-badge ux-badge--info">Pilot شخصي فعلي طويل المدى</p>
            <h1 id="pilot-title">{PILOT_2026.name}</h1>
            <p>
              اختبار فعلي للمنصة على البيانات المالية الشخصية حتى نهاية 2027، بدون إطلاق تجاري وبدون تنفيذ مالي تلقائي.
            </p>
          </div>
        </div>

        <div className="ux-card-grid">
          <article className="ux-card">
            <h2>فترة التجربة</h2>
            <p>{PILOT_2026.startsAt} — {PILOT_2026.endsAt}</p>
            <strong>{remaining} يومًا متبقيًا تقريبًا</strong>
          </article>
          <article className="ux-card">
            <h2>الدورات المسجلة</h2>
            <p>{pilot.totalCycles} دورة داخل فترة التجربة</p>
            <strong>{pilot.cyclesWithEngineState} منها لديها حالة مالية محسوبة</strong>
          </article>
          <article className="ux-card">
            <h2>التقييمات</h2>
            <p>{pilot.cyclesWithScore} دورة لديها درجة مالية</p>
            <strong>{pilot.cyclesWithHardGate} دورة عليها بوابة صارمة</strong>
          </article>
          <article className="ux-card">
            <h2>التنفيذ المالي</h2>
            <p>{pilot.verifiedExecutions} تنفيذ متحقق من أصل {pilot.executionReportsReceived} عملية تم الإبلاغ عنها.</p>
            <strong>لا يُحسب التنفيذ واقعًا قبل VERIFIED_EXECUTION.</strong>
          </article>
        </div>
      </section>

      <section className="ux-card" aria-labelledby="latest-state-title">
        <div className="ux-page-header">
          <div>
            <h2 id="latest-state-title">أحدث حالة مالية داخل التجربة</h2>
            <p>هذه القيم مأخوذة من أحدث Snapshot غير stale للدورة الأحدث، وليست أرقامًا تجريبية أو ثابتة.</p>
          </div>
        </div>

        {latest?.snapshotId ? (
          <div className="ux-card-grid">
            <article className="ux-card">
              <h3>الحالة</h3>
              <strong>{stateLabel(latest.finalState)}</strong>
              <p>الدرجة: {score(latest.weightedScore)}</p>
            </article>
            <article className="ux-card">
              <h3>السيولة الفعلية</h3>
              <strong>{money(latest.actualLiquidity)}</strong>
              <p>النقد الحر: {money(latest.freeCashAmount)}</p>
            </article>
            <article className="ux-card">
              <h3>الحماية</h3>
              <strong>{money(latest.protectionDeficit)}</strong>
              <p>عجز الحماية؛ الصفر يعني عدم وجود عجز.</p>
            </article>
            <article className="ux-card">
              <h3>نهاية الدورة المتوقعة</h3>
              <strong>{money(latest.projectedEndBalance)}</strong>
              <p>جاهزية التوصيات: {latest.recommendationReadiness ?? 'غير متاحة'}</p>
            </article>
          </div>
        ) : (
          <div className="ux-empty-state">
            <h3>لا توجد Snapshot مالية بعد</h3>
            <p>ابدأ دورة مالية وشغّل المحرك حتى تبدأ لوحة التجربة في بناء سجل فعلي قابل للمقارنة.</p>
            <Link className="ux-button ux-button--primary" href="/cycles/new">بدء دورة مالية</Link>
          </div>
        )}
      </section>

      <section className="ux-card" aria-labelledby="decision-trace-title">
        <div className="ux-page-header">
          <div>
            <h2 id="decision-trace-title">مسار التوصية → القرار → التنفيذ</h2>
            <p>هذا السجل يتتبع ما حدث فعليًا لكل توصية، ولا يعتبر مجرد إنشاء مهمة أو رفع إثبات تنفيذًا ماليًا متحققًا.</p>
          </div>
        </div>

        <div className="ux-card-grid">
          <article className="ux-card">
            <h3>التوصيات</h3>
            <strong>{pilot.totalRecommendations}</strong>
            <p>{pilot.recommendationsWithDecisionRequest} دخلت مسار القرار.</p>
          </article>
          <article className="ux-card">
            <h3>قرارات الاعتماد</h3>
            <strong>{pilot.userApprovedDecisions}</strong>
            <p>اعتمادات صريحة من المستخدم.</p>
          </article>
          <article className="ux-card">
            <h3>مهام التنفيذ</h3>
            <strong>{pilot.executionTasksCreated}</strong>
            <p>مهام تطلب من المستخدم التنفيذ خارجيًا.</p>
          </article>
          <article className="ux-card">
            <h3>التنفيذ المتحقق</h3>
            <strong>{pilot.verifiedExecutions}</strong>
            <p>هذه فقط هي الحالات المؤهلة لبدء قياس أثر القرار.</p>
          </article>
        </div>

        {pilot.decisions.length > 0 ? (
          <div className="ux-table-shell">
            <table className="ux-table">
              <thead>
                <tr>
                  <th scope="col">التوصية</th>
                  <th scope="col">الدورة</th>
                  <th scope="col">طلب القرار</th>
                  <th scope="col">قرار المستخدم</th>
                  <th scope="col">المبلغ</th>
                  <th scope="col">التنفيذ</th>
                  <th scope="col">الإثبات</th>
                </tr>
              </thead>
              <tbody>
                {pilot.decisions.map((item) => (
                  <tr key={item.recommendationId}>
                    <td>
                      <Link href={`/advisor/${item.recommendationId}`}>{item.title}</Link>
                      <br />
                      <small>{item.reasonCode}</small>
                    </td>
                    <td><Link href={`/cycles/${item.cycleId}`}>{item.cycleName}</Link></td>
                    <td>{item.decisionRequestStatus ?? 'لم يُنشأ'}</td>
                    <td>{decisionLabel(item.userDecisionAction)}</td>
                    <td>{money(item.executionAmount ?? item.requestedAmount, item.executionCurrency ?? 'SAR')}</td>
                    <td>{executionLabel(item)}</td>
                    <td>{item.evidenceVerificationStatus ?? (item.evidenceCaseId ? 'PENDING' : 'لا يوجد')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ux-empty-state">
            <h3>لا توجد توصيات داخل فترة التجربة بعد</h3>
            <p>عند توليد توصيات للدورات ستظهر هنا تلقائيًا مع تطور حالتها من القرار إلى التنفيذ والتحقق.</p>
          </div>
        )}
      </section>

      <section className="ux-card" aria-labelledby="history-title">
        <div className="ux-page-header">
          <div>
            <h2 id="history-title">السجل الفعلي للدورات</h2>
            <p>خط زمني لجميع الدورات التي تبدأ بين 16 سبتمبر 2026 و31 ديسمبر 2027.</p>
          </div>
        </div>

        {pilot.cycles.length > 0 ? (
          <div className="ux-table-shell">
            <table className="ux-table">
              <thead>
                <tr>
                  <th scope="col">الدورة</th>
                  <th scope="col">البداية</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">الدرجة</th>
                  <th scope="col">السيولة</th>
                  <th scope="col">النقد الحر</th>
                  <th scope="col">عجز الحماية</th>
                  <th scope="col">جاهزية التوصيات</th>
                  <th scope="col">التغطية</th>
                </tr>
              </thead>
              <tbody>
                {pilot.cycles.map((cycle) => (
                  <tr key={cycle.cycleId}>
                    <td><Link href={`/cycles/${cycle.cycleId}`}>{cycle.name}</Link></td>
                    <td>{cycle.startDate}</td>
                    <td>{stateLabel(cycle.finalState)}</td>
                    <td>{score(cycle.weightedScore)}</td>
                    <td>{money(cycle.actualLiquidity)}</td>
                    <td>{money(cycle.freeCashAmount)}</td>
                    <td>{money(cycle.protectionDeficit)}</td>
                    <td>{cycle.recommendationReadiness ?? '—'}</td>
                    <td>{cycle.dataCoverageBps == null ? '—' : `${(cycle.dataCoverageBps / 100).toFixed(0)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ux-empty-state">
            <h3>لم تبدأ دورة ضمن فترة التجربة بعد</h3>
            <p>ستظهر الدورات هنا تلقائيًا بمجرد إنشائها؛ لا يوجد إدخال يدوي خاص بالـPilot.</p>
          </div>
        )}
      </section>

      <section className="ux-card" aria-labelledby="objectives-title">
        <h2 id="objectives-title">ما الذي نختبره حتى نهاية 2027؟</h2>
        <ol>
          {PILOT_2026.objectives.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className="ux-card" aria-labelledby="acceptance-title">
        <h2 id="acceptance-title">شروط القبول قبل اعتبار المنصة جاهزة</h2>
        <ol>
          {PILOT_2026.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className="ux-card">
        <h2>دورة التحقق المستمرة</h2>
        <p>
          في نهاية كل دورة مالية نراجع الخطة، التنفيذ المؤكد، الانحرافات، التوصيات، وما حدث فعليًا بعدها. وفي نهاية كل ربع سنة نراجع الأنماط المتكررة قبل تعديل القواعد أو الأوزان.
        </p>
        <div className="ux-button-row">
          <Link className="ux-button ux-button--primary" href="/cycles/new">بدء دورة مالية</Link>
          <Link className="ux-button ux-button--secondary" href="/decision-log">سجل القرارات</Link>
          <Link className="ux-button ux-button--ghost" href="/reports">التقارير</Link>
        </div>
      </section>
    </main>
  );
}
