'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type ReviewItem = {
  reviewItemId: string;
  title: string;
  currentVersion: string;
  stage: string;
};

type PersistedItem = {
  proposalId: string;
  title: string;
  currentVersion: string;
  candidateVersion: string;
  lifecycleStage: string;
  backtestRunId: string | null;
  backtestOutcome: string | null;
};

async function postJson(path: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({ ok: false, error: 'INVALID_RESPONSE' }));
  return payload as { ok: boolean; error?: string };
}

export function GovernanceWritePanel({ reviewItems, persisted }: { reviewItems: ReviewItem[]; persisted: PersistedItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [decisionProposalId, setDecisionProposalId] = useState(persisted[0]?.proposalId ?? '');
  const decisionProposal = useMemo(
    () => persisted.find((item) => item.proposalId === decisionProposalId) ?? null,
    [persisted, decisionProposalId],
  );

  async function submit(path: string, body: unknown, success: string) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await postJson(path, body);
      if (!result.ok) {
        setMessage(`تعذر الحفظ: ${result.error ?? 'UNKNOWN_ERROR'}`);
        return;
      }
      setMessage(success);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function onProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void submit('/api/pilot/change-governance/proposals', {
      reviewItemId: String(data.get('reviewItemId') ?? ''),
      candidateVersion: String(data.get('candidateVersion') ?? ''),
      specText: String(data.get('specText') ?? ''),
      acceptanceCriteriaText: String(data.get('acceptanceCriteriaText') ?? ''),
      rollbackPlanText: String(data.get('rollbackPlanText') ?? ''),
    }, 'تم حفظ Spec في سجل الحوكمة الدائم.');
  }

  function onBacktest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void submit('/api/pilot/change-governance/backtests', {
      proposalId: String(data.get('proposalId') ?? ''),
      datasetStartsAt: String(data.get('datasetStartsAt') ?? ''),
      datasetEndsAt: String(data.get('datasetEndsAt') ?? ''),
      outcome: String(data.get('outcome') ?? ''),
      metricsText: String(data.get('metricsText') ?? ''),
      evidenceText: String(data.get('evidenceText') ?? ''),
      notes: String(data.get('notes') ?? '') || null,
    }, 'تم تسجيل Backtest في السجل الدائم.');
  }

  function onDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const decision = String(data.get('decision') ?? '');
    void submit('/api/pilot/change-governance/decisions', {
      proposalId: decisionProposalId,
      backtestRunId: decision === 'APPROVED' ? decisionProposal?.backtestRunId ?? null : decisionProposal?.backtestRunId ?? null,
      decision,
      rationale: String(data.get('rationale') ?? ''),
    }, 'تم تسجيل قرار الحوكمة في السجل الدائم.');
  }

  return (
    <section className="ux-card" aria-labelledby="governance-write-title">
      <div className="ux-page-header">
        <div>
          <p className="ux-badge ux-badge--warning">Manual governance only</p>
          <h2 id="governance-write-title">إدارة دورة التغيير الخوارزمية</h2>
          <p>هذه النماذج تحفظ Spec وBacktest والقرار فقط. لا يوجد هنا أي تطبيق تلقائي للسياسات أو الأوزان.</p>
        </div>
      </div>

      {message ? <p className="ux-alert">{message}</p> : null}

      <div className="ux-card-grid">
        <form className="ux-card" onSubmit={onProposal}>
          <h3>1. حفظ Spec رسمي</h3>
          <label className="ux-field">عنصر المراجعة
            <select className="ux-input" name="reviewItemId" required defaultValue="">
              <option value="" disabled>اختر عنصر مراجعة</option>
              {reviewItems.filter((item) => item.stage !== 'EVIDENCE_COLLECTION').map((item) => (
                <option key={item.reviewItemId} value={item.reviewItemId}>{item.title} · {item.currentVersion}</option>
              ))}
            </select>
          </label>
          <label className="ux-field">الإصدار المرشح<input className="ux-input" name="candidateVersion" required maxLength={120} /></label>
          <label className="ux-field">التغيير المحدد<textarea className="ux-input" name="specText" required minLength={20} rows={4} /></label>
          <label className="ux-field">معايير القبول<textarea className="ux-input" name="acceptanceCriteriaText" required minLength={20} rows={4} /></label>
          <label className="ux-field">خطة Rollback<textarea className="ux-input" name="rollbackPlanText" required minLength={20} rows={4} /></label>
          <button className="ux-button ux-button--primary" type="submit" disabled={busy}>حفظ Spec</button>
        </form>

        <form className="ux-card" onSubmit={onBacktest}>
          <h3>2. تسجيل Backtest</h3>
          <label className="ux-field">المقترح
            <select className="ux-input" name="proposalId" required defaultValue="">
              <option value="" disabled>اختر مقترحًا محفوظًا</option>
              {persisted.map((item) => (
                <option key={item.proposalId} value={item.proposalId}>{item.title} · {item.candidateVersion}</option>
              ))}
            </select>
          </label>
          <label className="ux-field">بداية البيانات<input className="ux-input" type="date" name="datasetStartsAt" required /></label>
          <label className="ux-field">نهاية البيانات<input className="ux-input" type="date" name="datasetEndsAt" required /></label>
          <label className="ux-field">النتيجة
            <select className="ux-input" name="outcome" required defaultValue="INCONCLUSIVE">
              <option value="PASSED">PASSED</option><option value="FAILED">FAILED</option><option value="INCONCLUSIVE">INCONCLUSIVE</option>
            </select>
          </label>
          <label className="ux-field">المقاييس والنتائج<textarea className="ux-input" name="metricsText" required minLength={20} rows={4} /></label>
          <label className="ux-field">الأدلة<textarea className="ux-input" name="evidenceText" required minLength={20} rows={4} /></label>
          <label className="ux-field">ملاحظات<textarea className="ux-input" name="notes" rows={3} /></label>
          <button className="ux-button ux-button--secondary" type="submit" disabled={busy || persisted.length === 0}>تسجيل Backtest</button>
        </form>

        <form className="ux-card" onSubmit={onDecision}>
          <h3>3. تسجيل القرار</h3>
          <label className="ux-field">المقترح
            <select className="ux-input" required value={decisionProposalId} onChange={(event) => setDecisionProposalId(event.target.value)}>
              <option value="" disabled>اختر مقترحًا محفوظًا</option>
              {persisted.map((item) => (
                <option key={item.proposalId} value={item.proposalId}>{item.title} · {item.candidateVersion}</option>
              ))}
            </select>
          </label>
          <p>آخر Backtest: {decisionProposal?.backtestOutcome ?? 'غير موجود'}</p>
          <label className="ux-field">القرار
            <select className="ux-input" name="decision" required defaultValue="CHANGES_REQUESTED">
              <option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option><option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
            </select>
          </label>
          <label className="ux-field">مبررات القرار<textarea className="ux-input" name="rationale" required minLength={20} rows={5} /></label>
          <button className="ux-button ux-button--primary" type="submit" disabled={busy || persisted.length === 0}>تسجيل القرار</button>
          <p>قاعدة البيانات سترفض APPROVED ما لم يكن Backtest المشار إليه PASSED لنفس المقترح.</p>
        </form>
      </div>
    </section>
  );
}
