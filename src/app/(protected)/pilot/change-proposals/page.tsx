import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { PILOT_2026 } from '@/config/pilot-2026';
import { getPilotAlgorithmChangeProposals } from '@/features/pilot/queries/get-pilot-change-proposals';
import { getPersistedAlgorithmGovernance } from '@/features/pilot/queries/get-persisted-algorithm-governance';
import { GovernanceWritePanel } from './governance-write-panel';

function stageLabel(value: string): string {
  const labels: Record<string, string> = {
    EVIDENCE_COLLECTION: 'جمع الأدلة',
    SPEC_REQUIRED: 'مطلوب تحديد التغيير',
    BACKTEST_REQUIRED: 'مطلوب Backtest',
    DECISION_BLOCKED: 'القرار محظور',
    SPEC_RECORDED: 'Spec محفوظ',
    BACKTESTED: 'Backtest مكتمل',
    DECIDED: 'تم اتخاذ قرار',
    RELEASED: 'تم إصدار نسخة',
    ROLLED_BACK: 'تم الرجوع عن الإصدار',
  };
  return labels[value] ?? value;
}

function targetLabel(value: string): string {
  const labels: Record<string, string> = {
    POLICY: 'السياسة',
    WEIGHTS: 'الأوزان',
    THRESHOLDS: 'الحدود والبوابات',
    ENGINE_LOGIC: 'منطق المحرك',
    MEASUREMENT_CONTRACT: 'عقد القياس',
  };
  return labels[value] ?? value;
}

export default async function PilotChangeProposalsPage() {
  const user = await requireAuthenticatedUser();
  const [proposals, governance] = await Promise.all([
    getPilotAlgorithmChangeProposals(user.id, PILOT_2026.startsAt, PILOT_2026.endsAt),
    getPersistedAlgorithmGovernance(user.id),
  ]);
  const blocked = proposals.filter((item) => item.approvalStatus === 'BLOCKED').length;
  const specRequired = proposals.filter((item) => item.stage === 'SPEC_REQUIRED').length;

  return (
    <main className="ux-page-shell" dir="rtl">
      <section className="ux-card" aria-labelledby="change-proposal-title">
        <div className="ux-page-header">
          <div>
            <p className="ux-badge ux-badge--info">Pilot · Algorithm Change Proposal Lifecycle</p>
            <h1 id="change-proposal-title">دورة اقتراح تغيير الخوارزمية</h1>
            <p>
              يحول هذا المسار أنماط المراجعة إلى مقترحات تغيير محكومة. لا يمكن اعتماد أي تغيير قبل وجود Spec واضح، Backtest مقارن، قرار صريح، وخطة Rollback.
            </p>
          </div>
          <div className="ux-button-row">
            <Link className="ux-button ux-button--secondary" href="/pilot/algorithm-review">قائمة المراجعة</Link>
            <Link className="ux-button ux-button--ghost" href="/pilot">العودة إلى Pilot</Link>
          </div>
        </div>

        <div className="ux-card-grid">
          <article className="ux-card">
            <h2>المقترحات الحالية</h2>
            <strong>{proposals.length}</strong>
            <p>مشتقة فقط من أنماط المراجعة الفعلية.</p>
          </article>
          <article className="ux-card">
            <h2>تحتاج Spec</h2>
            <strong>{specRequired}</strong>
            <p>وصلت حد المراجعة لكن لا يوجد تغيير رقمي/قاعدي محدد بعد.</p>
          </article>
          <article className="ux-card">
            <h2>الاعتماد المحظور</h2>
            <strong>{blocked}</strong>
            <p>لا يوجد أي تطبيق تلقائي أو اعتماد قبل Backtest موثق.</p>
          </article>
          <article className="ux-card">
            <h2>سجل الحوكمة الدائم</h2>
            <strong>{governance.storageReady ? governance.rows.length : 'بانتظار Migration'}</strong>
            <p>السجل Append-only ولا يسمح بتعديل التاريخ أو حذفه.</p>
          </article>
        </div>
      </section>

      {governance.storageReady ? (
        <GovernanceWritePanel
          reviewItems={proposals.map((item) => ({
            reviewItemId: item.reviewItemId,
            title: item.title,
            currentVersion: item.currentVersion,
            stage: item.stage,
          }))}
          persisted={governance.rows.map((row) => ({
            proposalId: row.proposalId,
            title: row.title,
            target: row.target,
            currentVersion: row.currentVersion,
            candidateVersion: row.candidateVersion,
            lifecycleStage: row.lifecycleStage,
            backtestRunId: row.backtestRunId,
            backtestOutcome: row.backtestOutcome,
          }))}
        />
      ) : null}

      <section className="ux-card" aria-labelledby="persisted-governance-title">
        <div className="ux-page-header">
          <div>
            <p className={`ux-badge ${governance.storageReady ? 'ux-badge--success' : 'ux-badge--warning'}`}>
              {governance.storageReady ? 'Governance ledger ready' : 'Migration required'}
            </p>
            <h2 id="persisted-governance-title">السجل الدائم للمقترحات المعتمدة للحفظ</h2>
            <p>
              بمجرد حفظ Spec رسمي، تنتقل دورة التغيير إلى سجل غير قابل للطمس: Spec → Backtest → قرار → Release → Rollback عند الحاجة.
            </p>
          </div>
        </div>

        {governance.rows.length > 0 ? (
          <div className="ux-table-shell">
            <table className="ux-table">
              <thead>
                <tr>
                  <th scope="col">المقترح</th>
                  <th scope="col">الهدف</th>
                  <th scope="col">النسخة</th>
                  <th scope="col">Backtest</th>
                  <th scope="col">القرار</th>
                  <th scope="col">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {governance.rows.map((row) => (
                  <tr key={row.proposalId}>
                    <td>{row.title}</td>
                    <td>{targetLabel(row.target)}</td>
                    <td>{row.currentVersion} → {row.candidateVersion}</td>
                    <td>{row.backtestOutcome ?? 'لم يُسجل'}</td>
                    <td>{row.decision ?? 'لم يُتخذ'}</td>
                    <td>{stageLabel(row.lifecycleStage)}{row.rollbackToVersion ? ` → ${row.rollbackToVersion}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ux-empty-state">
            <h3>{governance.storageReady ? 'لا توجد Specs محفوظة بعد' : 'قاعدة الحوكمة لم تُطبق بعد'}</h3>
            <p>
              {governance.storageReady
                ? 'لن يظهر سجل دائم حتى يتم تحويل مقترح مراجعة إلى Spec رسمي محدد وقابل للاختبار.'
                : 'الكود جاهز، لكن الجداول الجديدة لا تُستخدم قبل تطبيق migration الإنتاجية الصريحة.'}
            </p>
          </div>
        )}
      </section>

      {proposals.length > 0 ? proposals.map((proposal) => (
        <section className="ux-card" key={proposal.id} aria-labelledby={proposal.id}>
          <div className="ux-page-header">
            <div>
              <p className="ux-badge ux-badge--info">{stageLabel(proposal.stage)} · {targetLabel(proposal.target)}</p>
              <h2 id={proposal.id}>{proposal.title}</h2>
              <p>{proposal.rationale}</p>
            </div>
          </div>

          <div className="ux-card-grid">
            <article className="ux-card">
              <h3>الإصدار الحالي</h3>
              <strong>{proposal.currentVersion}</strong>
              <p>الإصدار المقترح: {proposal.proposedVersion ?? 'لم يُنشأ بعد'}</p>
            </article>
            <article className="ux-card">
              <h3>حجم الدليل</h3>
              <strong>{proposal.recommendationCount} توصيات</strong>
              <p>{proposal.evidenceCount} إشارة موثقة.</p>
            </article>
            <article className="ux-card">
              <h3>حالة Backtest</h3>
              <strong>{proposal.backtestStatus}</strong>
              <p>{proposal.backtestRequirement}</p>
            </article>
            <article className="ux-card">
              <h3>قرار الاعتماد</h3>
              <strong>{proposal.approvalStatus}</strong>
              <p>{proposal.approvalBlocker}</p>
            </article>
          </div>

          <div className="ux-card-grid">
            <article className="ux-card">
              <h3>المطلوب قبل الاختبار</h3>
              <p>{proposal.requiredSpec}</p>
            </article>
            <article className="ux-card">
              <h3>الإجراء المقترح</h3>
              <p>{proposal.proposedAction}</p>
            </article>
            <article className="ux-card">
              <h3>شرط Rollback</h3>
              <p>{proposal.rollbackRequirement}</p>
            </article>
          </div>

          <div className="ux-table-shell">
            <table className="ux-table">
              <thead>
                <tr>
                  <th scope="col">الدليل المرتبط</th>
                  <th scope="col">الاستخدام</th>
                </tr>
              </thead>
              <tbody>
                {proposal.recommendationIds.map((recommendationId) => (
                  <tr key={recommendationId}>
                    <td><Link href={`/advisor/${recommendationId}`}>فتح التوصية {recommendationId}</Link></td>
                    <td>عينة Backtest ومراجعة سببية لاحقة</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )) : (
        <section className="ux-card ux-empty-state">
          <h2>لا توجد مقترحات تغيير بعد</h2>
          <p>لن تُنشأ مقترحات قبل وصول أنماط جودة التوصيات إلى قائمة المراجعة.</p>
          <Link className="ux-button ux-button--primary" href="/pilot/algorithm-review">فتح قائمة المراجعة</Link>
        </section>
      )}
    </main>
  );
}
