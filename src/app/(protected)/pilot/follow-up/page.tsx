import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { PILOT_2026 } from '@/config/pilot-2026';
import {
  getPilotLongitudinalFollowups,
  type PilotFollowupCheckpoint,
  type PilotFollowupCheckpointCode,
  type PilotFollowupDirection,
} from '@/features/pilot/queries/get-pilot-followups';

function money(value: string | null): string {
  if (value == null) return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 2,
  }).format(parsed);
}

function signedMoney(value: string | null): string {
  if (value == null) return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return `${parsed > 0 ? '+' : ''}${money(String(parsed))}`;
}

function signedScore(value: string | null): string {
  if (value == null) return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return `${parsed > 0 ? '+' : ''}${parsed.toFixed(1)}`;
}

function checkpointLabel(code: PilotFollowupCheckpointCode): string {
  const labels: Record<PilotFollowupCheckpointCode, string> = {
    IMMEDIATE: 'بعد التنفيذ مباشرة',
    DAY_30: 'بعد 30 يومًا',
    DAY_90: 'بعد 90 يومًا',
    CYCLE_END: 'عند حد الدورة المخطط',
  };
  return labels[code];
}

function directionLabel(direction: PilotFollowupDirection): string {
  const labels: Record<PilotFollowupDirection, string> = {
    IMPROVED: 'تحسن رصدي',
    NEUTRAL: 'محايد',
    DETERIORATED: 'تدهور رصدي',
    PENDING: 'بانتظار بيانات لاحقة',
  };
  return labels[direction];
}

function checkpointSummary(checkpoint: PilotFollowupCheckpoint): string {
  if (!checkpoint.snapshotId) return 'لم تتوفر Snapshot عند أو بعد الموعد المستهدف بعد.';
  return `النقد الحر ${signedMoney(checkpoint.freeCashDelta)} · عجز الحماية ${signedMoney(checkpoint.protectionDeficitDelta)} · الدرجة ${signedScore(checkpoint.weightedScoreDelta)}`;
}

export default async function PilotFollowUpPage() {
  const user = await requireAuthenticatedUser();
  const followups = await getPilotLongitudinalFollowups(user.id, PILOT_2026.startsAt, PILOT_2026.endsAt);
  const allCheckpoints = followups.flatMap((item) => item.checkpoints);
  const available = allCheckpoints.filter((item) => item.snapshotId !== null);
  const day30Available = allCheckpoints.filter((item) => item.code === 'DAY_30' && item.snapshotId !== null).length;
  const day90Available = allCheckpoints.filter((item) => item.code === 'DAY_90' && item.snapshotId !== null).length;

  return (
    <main className="ux-page-shell" dir="rtl">
      <section className="ux-card" aria-labelledby="pilot-followup-title">
        <div className="ux-page-header">
          <div>
            <p className="ux-badge ux-badge--info">Pilot · متابعة الأثر طويل المدى</p>
            <h1 id="pilot-followup-title">متابعة القرار بعد التنفيذ</h1>
            <p>
              لكل تنفيذ وصل إلى VERIFIED_EXECUTION نتابع الحالة المالية مباشرة، وبعد 30 يومًا، وبعد 90 يومًا، وعند حد الدورة المخطط. نقاط 30 و90 يومًا قد تقع في دورات مالية لاحقة، لذلك تتبع المتابعة حالة المستخدم عبر الدورات بدل حبس القياس داخل الدورة الأصلية.
            </p>
          </div>
          <div className="ux-button-row">
            <Link className="ux-button ux-button--secondary" href="/pilot">العودة إلى Pilot Dashboard</Link>
          </div>
        </div>

        <div className="ux-card-grid">
          <article className="ux-card">
            <h2>قرارات قيد المتابعة</h2>
            <strong>{followups.length}</strong>
            <p>تنفيذات متحققة فقط.</p>
          </article>
          <article className="ux-card">
            <h2>نقاط قياس متاحة</h2>
            <strong>{available.length}</strong>
            <p>من أصل {allCheckpoints.length} نقطة زمنية مطلوبة.</p>
          </article>
          <article className="ux-card">
            <h2>متابعة 30 يومًا</h2>
            <strong>{day30Available}</strong>
            <p>قرارات لديها Snapshot بعد 30 يومًا.</p>
          </article>
          <article className="ux-card">
            <h2>متابعة 90 يومًا</h2>
            <strong>{day90Available}</strong>
            <p>قرارات لديها Snapshot بعد 90 يومًا.</p>
          </article>
        </div>
      </section>

      {followups.length > 0 ? followups.map((item) => (
        <section className="ux-card" key={item.recommendationId} aria-labelledby={`followup-${item.recommendationId}`}>
          <div className="ux-page-header">
            <div>
              <h2 id={`followup-${item.recommendationId}`}>{item.title}</h2>
              <p>
                الدورة الأصلية: <Link href={`/cycles/${item.cycleId}`}>{item.cycleName}</Link> · التنفيذ المتحقق: {item.executedAt}
              </p>
              <p>خط الأساس: النقد الحر {money(item.baselineFreeCashAmount)} · عجز الحماية {money(item.baselineProtectionDeficit)} · الدرجة {item.baselineWeightedScore ?? '—'}</p>
            </div>
            <Link className="ux-button ux-button--ghost" href={`/advisor/${item.recommendationId}`}>فتح التوصية</Link>
          </div>

          <div className="ux-table-shell">
            <table className="ux-table">
              <thead>
                <tr>
                  <th scope="col">نقطة المتابعة</th>
                  <th scope="col">الموعد المستهدف</th>
                  <th scope="col">البيانات الفعلية</th>
                  <th scope="col">الاتجاه الرصدي</th>
                  <th scope="col">التغير عن خط الأساس</th>
                </tr>
              </thead>
              <tbody>
                {item.checkpoints.map((checkpoint) => (
                  <tr key={checkpoint.code}>
                    <td>{checkpointLabel(checkpoint.code)}</td>
                    <td>{checkpoint.targetAt}</td>
                    <td>{checkpoint.asOfAt ?? 'بانتظار Snapshot'}</td>
                    <td>{directionLabel(checkpoint.direction)}</td>
                    <td>{checkpointSummary(checkpoint)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            هذا سجل رصدي طويل المدى. تحسن الحالة أو تدهورها بعد التنفيذ لا يثبت وحده أن القرار هو السبب، لأن الدخل والمصروفات والطوارئ والقرارات اللاحقة قد تؤثر في النتيجة.
          </p>
        </section>
      )) : (
        <section className="ux-card ux-empty-state">
          <h2>لا توجد تنفيذات متحققة للمتابعة بعد</h2>
          <p>ستبدأ هذه الصفحة تلقائيًا عند وجود قرار وصل إلى VERIFIED_EXECUTION، ولن تنشئ أي تنفيذ مالي أو بيانات افتراضية.</p>
          <Link className="ux-button ux-button--primary" href="/pilot">العودة إلى Pilot Dashboard</Link>
        </section>
      )}
    </main>
  );
}
