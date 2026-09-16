import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { PILOT_2026 } from '@/config/pilot-2026';
import { getPilotAlgorithmReviewQueue } from '@/features/pilot/queries/get-pilot-algorithm-review-queue';

function severityLabel(value: 'WATCH' | 'REVIEW_REQUIRED'): string {
  return value === 'REVIEW_REQUIRED' ? 'مراجعة مطلوبة' : 'تحت المراقبة';
}

export default async function PilotAlgorithmReviewPage() {
  const user = await requireAuthenticatedUser();
  const queue = await getPilotAlgorithmReviewQueue(user.id, PILOT_2026.startsAt, PILOT_2026.endsAt);
  const reviewRequired = queue.filter((item) => item.severity === 'REVIEW_REQUIRED').length;

  return (
    <main className="ux-page-shell" dir="rtl">
      <section className="ux-card" aria-labelledby="algorithm-review-title">
        <div className="ux-page-header">
          <div>
            <p className="ux-badge ux-badge--info">Pilot · حوكمة التعلم الخوارزمي</p>
            <h1 id="algorithm-review-title">قائمة مراجعة الخوارزمية</h1>
            <p>
              تجمع هذه الصفحة الأنماط المتكررة من تقييم جودة التوصيات. لا تغيّر الأوزان أو القواعد تلقائيًا، ولا تعتبر التكرار إثباتًا كافيًا على وجود خطأ في الخوارزمية.
            </p>
          </div>
          <div className="ux-button-row">
            <Link className="ux-button ux-button--secondary" href="/pilot/quality">جودة التوصيات</Link>
            <Link className="ux-button ux-button--ghost" href="/pilot">العودة إلى Pilot</Link>
          </div>
        </div>

        <div className="ux-card-grid">
          <article className="ux-card">
            <h2>عناصر المراجعة</h2>
            <strong>{queue.length}</strong>
            <p>أنماط وصلت إلى حد المراقبة على الأقل.</p>
          </article>
          <article className="ux-card">
            <h2>مراجعة مطلوبة</h2>
            <strong>{reviewRequired}</strong>
            <p>ثلاث توصيات متأثرة أو أكثر.</p>
          </article>
          <article className="ux-card">
            <h2>قاعدة الأمان</h2>
            <strong>0 تغييرات تلقائية</strong>
            <p>كل اقتراح يبقى PENDING_REVIEW حتى تتم مراجعته صراحة.</p>
          </article>
        </div>
      </section>

      {queue.length > 0 ? queue.map((item) => (
        <section className="ux-card" key={item.id} aria-labelledby={`review-${item.id}`}>
          <div className="ux-page-header">
            <div>
              <p className="ux-badge ux-badge--info">{severityLabel(item.severity)} · {item.status}</p>
              <h2 id={`review-${item.id}`}>{item.title}</h2>
              <p>{item.rationale}</p>
            </div>
          </div>

          <div className="ux-card-grid">
            <article className="ux-card">
              <h3>البعد</h3>
              <strong>{item.dimensionLabel}</strong>
              <p>{item.dimensionKey}</p>
            </article>
            <article className="ux-card">
              <h3>حجم الدليل</h3>
              <strong>{item.recommendationCount} توصيات</strong>
              <p>{item.evidenceCount} إشارات CONCERN موثقة.</p>
            </article>
            <article className="ux-card">
              <h3>الإجراء المقترح</h3>
              <p>{item.proposedAction}</p>
            </article>
          </div>

          <div className="ux-table-shell">
            <table className="ux-table">
              <thead>
                <tr>
                  <th scope="col">الأدلة المرتبطة</th>
                  <th scope="col">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {item.recommendationIds.map((recommendationId) => (
                  <tr key={recommendationId}>
                    <td><Link href={`/advisor/${recommendationId}`}>فتح التوصية {recommendationId}</Link></td>
                    <td>جزء من النمط المتكرر</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            لا توجد في هذه المرحلة أزرار «تطبيق». اعتماد أي تعديل مستقبلي يجب أن يمر بمراجعة مستقلة واختبار رجعي ثم إصدار نسخة جديدة من السياسة/الأوزان، مع بقاء النسخة السابقة قابلة للتتبع.
          </p>
        </section>
      )) : (
        <section className="ux-card ux-empty-state">
          <h2>لا توجد أنماط متكررة تستدعي المراجعة بعد</h2>
          <p>يبدأ العنصر بالمراقبة بعد ظهور CONCERN في توصيتين، ويرتفع إلى مراجعة مطلوبة عند ثلاث توصيات أو أكثر.</p>
          <Link className="ux-button ux-button--primary" href="/pilot/quality">فتح جودة التوصيات</Link>
        </section>
      )}
    </main>
  );
}
