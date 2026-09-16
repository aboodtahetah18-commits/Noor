import Link from 'next/link';
import { PILOT_2026 } from '@/config/pilot-2026';

function daysRemaining(end: string): number {
  const endDate = new Date(`${end}T23:59:59+03:00`).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((endDate - now) / 86_400_000));
}

export default function PilotPage() {
  const remaining = daysRemaining(PILOT_2026.endsAt);

  return (
    <main className="ux-page-shell" dir="rtl">
      <section className="ux-card" aria-labelledby="pilot-title">
        <div className="ux-page-header">
          <div>
            <p className="ux-badge ux-badge--info">Pilot شخصي فعلي</p>
            <h1 id="pilot-title">{PILOT_2026.name}</h1>
            <p>
              فترة التحقق الفعلية من المنصة على بيانات شخصية حقيقية، بدون إطلاق تجاري وبدون تنفيذ مالي تلقائي.
            </p>
          </div>
        </div>

        <div className="ux-card-grid">
          <article className="ux-card">
            <h2>الفترة</h2>
            <p>{PILOT_2026.startsAt} — {PILOT_2026.endsAt}</p>
            <strong>{remaining} يومًا متبقيًا تقريبًا</strong>
          </article>
          <article className="ux-card">
            <h2>التنفيذ المالي</h2>
            <p>المستخدم ينفذ خارجيًا، والمنصة لا تعتبر التنفيذ واقعًا قبل VERIFIED_EXECUTION.</p>
          </article>
          <article className="ux-card">
            <h2>الإطلاق التجاري</h2>
            <p>موقوف حتى المراجعة الختامية بعد نهاية التجربة في 31 ديسمبر 2026.</p>
          </article>
        </div>
      </section>

      <section className="ux-card" aria-labelledby="objectives-title">
        <h2 id="objectives-title">ما الذي نختبره؟</h2>
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
        <h2>المتابعة الشهرية</h2>
        <p>
          في نهاية كل دورة مالية نراجع الخطة، التنفيذ المؤكد، الانحرافات، التوصيات، وما حدث فعليًا بعدها.
        </p>
        <div className="ux-button-row">
          <Link className="ux-button ux-button--primary" href="/cycles">الدورات المالية</Link>
          <Link className="ux-button ux-button--secondary" href="/decision-log">سجل القرارات</Link>
          <Link className="ux-button ux-button--ghost" href="/reports">التقارير</Link>
        </div>
      </section>
    </main>
  );
}
