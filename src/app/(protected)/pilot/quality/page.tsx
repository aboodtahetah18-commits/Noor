import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { PILOT_2026 } from '@/config/pilot-2026';
import {
  getPilotRecommendationQuality,
  type PilotQualityDimensionStatus,
} from '@/features/pilot/queries/get-pilot-quality';

function score(value: number | null): string {
  return value == null ? '—' : value.toFixed(1);
}

function statusLabel(status: PilotQualityDimensionStatus): string {
  const labels: Record<PilotQualityDimensionStatus, string> = {
    SUPPORTED: 'مدعوم بالبيانات',
    NEUTRAL: 'محايد / يحتاج سياق',
    CONCERN: 'يحتاج مراجعة',
    NOT_ASSESSABLE: 'غير قابل للتقييم بعد',
  };
  return labels[status];
}

function confidenceLabel(confidence: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  const labels = {
    LOW: 'منخفضة',
    MEDIUM: 'متوسطة',
    HIGH: 'عالية',
  } as const;
  return labels[confidence];
}

export default async function PilotQualityPage() {
  const user = await requireAuthenticatedUser();
  const quality = await getPilotRecommendationQuality(user.id, PILOT_2026.startsAt, PILOT_2026.endsAt);
  const scored = quality.filter((item) => item.qualityScore != null);
  const average = scored.length > 0
    ? scored.reduce((sum, item) => sum + (item.qualityScore ?? 0), 0) / scored.length
    : null;
  const requiringReview = quality.filter((item) => item.requiresReview).length;
  const highConfidence = quality.filter((item) => item.confidence === 'HIGH').length;

  return (
    <main className="ux-page-shell" dir="rtl">
      <section className="ux-card" aria-labelledby="pilot-quality-title">
        <div className="ux-page-header">
          <div>
            <p className="ux-badge ux-badge--info">Pilot · جودة التوصيات</p>
            <h1 id="pilot-quality-title">تقييم جودة التوصية من الأدلة الفعلية</h1>
            <p>
              هذه الصفحة تقيّم فقط الأبعاد التي تدعمها البيانات الفعلية بعد التنفيذ. أي بُعد لا يملك مرجعًا أو نتيجة كافية يبقى «غير قابل للتقييم» ولا يحصل على درجة مصطنعة.
            </p>
          </div>
          <div className="ux-button-row">
            <Link className="ux-button ux-button--secondary" href="/pilot/follow-up">المتابعة الزمنية</Link>
            <Link className="ux-button ux-button--ghost" href="/pilot">Pilot Dashboard</Link>
          </div>
        </div>

        <div className="ux-card-grid">
          <article className="ux-card">
            <h2>توصيات مؤهلة</h2>
            <strong>{quality.length}</strong>
            <p>توصيات وصلت إلى تنفيذ متحقق ولديها سجل متابعة.</p>
          </article>
          <article className="ux-card">
            <h2>متوسط الدرجة المقاسة</h2>
            <strong>{score(average)}</strong>
            <p>متوسط الأبعاد القابلة للقياس فقط، وليس تقييمًا شاملًا عند نقص الأدلة.</p>
          </article>
          <article className="ux-card">
            <h2>تحتاج مراجعة</h2>
            <strong>{requiringReview}</strong>
            <p>ظهر فيها بُعد واحد على الأقل بحالة تحتاج مراجعة.</p>
          </article>
          <article className="ux-card">
            <h2>ثقة تقييم عالية</h2>
            <strong>{highConfidence}</strong>
            <p>اكتملت فيها نسبة كبيرة من الأبعاد القابلة للقياس.</p>
          </article>
        </div>

        <p>
          لا تغيّر هذه الدرجة أوزان المحرك أو قواعده تلقائيًا. أي تعديل خوارزمي يجب أن يمر بمراجعة مستقلة تستند إلى نمط متكرر عبر عدة قرارات ودورات، لا إلى نتيجة واحدة.
        </p>
      </section>

      {quality.length > 0 ? quality.map((item) => (
        <section className="ux-card" key={item.recommendationId} aria-labelledby={`quality-${item.recommendationId}`}>
          <div className="ux-page-header">
            <div>
              <h2 id={`quality-${item.recommendationId}`}>{item.title}</h2>
              <p>
                الدورة: <Link href={`/cycles/${item.cycleId}`}>{item.cycleName}</Link> · الدرجة المقاسة: {score(item.qualityScore)} · ثقة التقييم: {confidenceLabel(item.confidence)}
              </p>
              <p>{item.assessableDimensions} من أصل {item.totalDimensions} أبعاد قابلة للتقييم حاليًا.</p>
            </div>
            <Link className="ux-button ux-button--ghost" href={`/advisor/${item.recommendationId}`}>فتح التوصية</Link>
          </div>

          {item.requiresReview ? (
            <p className="ux-badge ux-badge--warning">توجد إشارة واحدة على الأقل تحتاج مراجعة بشرية قبل تعديل أي قاعدة أو وزن.</p>
          ) : null}

          <div className="ux-table-shell">
            <table className="ux-table">
              <thead>
                <tr>
                  <th scope="col">البُعد</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">الدرجة</th>
                  <th scope="col">سبب التقييم</th>
                </tr>
              </thead>
              <tbody>
                {item.dimensions.map((dimension) => (
                  <tr key={dimension.key}>
                    <td>{dimension.label}</td>
                    <td>{statusLabel(dimension.status)}</td>
                    <td>{dimension.score == null ? 'لا تُحتسب' : dimension.score.toFixed(0)}</td>
                    <td>{dimension.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )) : (
        <section className="ux-card ux-empty-state">
          <h2>لا توجد توصيات مؤهلة للتقييم بعد</h2>
          <p>يبدأ التقييم بعد وجود قرار منفذ ومتحقق وبيانات متابعة مالية لاحقة. لن تُنشأ درجات افتراضية قبل ذلك.</p>
          <div className="ux-button-row">
            <Link className="ux-button ux-button--primary" href="/pilot/follow-up">فتح المتابعة الزمنية</Link>
            <Link className="ux-button ux-button--secondary" href="/pilot">العودة إلى Pilot Dashboard</Link>
          </div>
        </section>
      )}
    </main>
  );
}
