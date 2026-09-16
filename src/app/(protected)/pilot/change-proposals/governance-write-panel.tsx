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
  target: string;
  currentVersion: string;
  candidateVersion: string;
  lifecycleStage: string;
  backtestRunId: string | null;
  backtestOutcome: string | null;
};

type ApiResult = { ok: boolean; error?: string; outcome?: string };

async function postJson(path: string, body: unknown): Promise<ApiResult> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({ ok: false, error: 'INVALID_RESPONSE' }));
  return payload as ApiResult;
}

function numeric(data: FormData, key: string): number {
  return Number(String(data.get(key) ?? ''));
}

function candidateExample(target: string | undefined): string {
  if (target === 'WEIGHTS') {
    return JSON.stringify({
      essentials: 18,
      cashLiquidity: 15,
      reserveEmergency: 15,
      debt: 12,
      incomeShock: 10,
      spendingFlexibility: 8,
      assetLiquidity: 7,
      executionDiscipline: 6,
      goals: 5,
      investmentConcentration: 4,
    }, null, 2);
  }
  if (target === 'THRESHOLDS') {
    return JSON.stringify({ vulnerableMin: 40, balancedMin: 55, stableMin: 70, strongMin: 85 }, null, 2);
  }
  return '{}';
}

export function GovernanceWritePanel({ reviewItems, persisted }: { reviewItems: ReviewItem[]; persisted: PersistedItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [decisionProposalId, setDecisionProposalId] = useState(persisted[0]?.proposalId ?? '');
  const automatedEligible = useMemo(
    () => persisted.filter((item) => item.target === 'WEIGHTS' || item.target === 'THRESHOLDS'),
    [persisted],
  );
  const [compareProposalId, setCompareProposalId] = useState(automatedEligible[0]?.proposalId ?? '');
  const decisionProposal = useMemo(
    () => persisted.find((item) => item.proposalId === decisionProposalId) ?? null,
    [persisted, decisionProposalId],
  );
  const compareProposal = useMemo(
    () => automatedEligible.find((item) => item.proposalId === compareProposalId) ?? null,
    [automatedEligible, compareProposalId],
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
      setMessage(result.outcome ? `${success} النتيجة: ${result.outcome}.` : success);
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

  function onComparativeBacktest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!compareProposal) return;
    const data = new FormData(event.currentTarget);
    let candidateConfig: unknown;
    try {
      candidateConfig = JSON.parse(String(data.get('candidateConfig') ?? '{}'));
    } catch {
      setMessage('تعذر تشغيل Backtest: صيغة إعدادات النسخة المرشحة ليست JSON صالحة.');
      return;
    }

    void submit('/api/pilot/change-governance/backtests/compare', {
      proposalId: compareProposal.proposalId,
      datasetStartsAt: String(data.get('datasetStartsAt') ?? ''),
      datasetEndsAt: String(data.get('datasetEndsAt') ?? ''),
      ...(compareProposal.target === 'WEIGHTS'
        ? { candidateWeights: candidateConfig }
        : { candidateThresholds: candidateConfig }),
      acceptance: {
        minSampleCount: numeric(data, 'minSampleCount'),
        maxStateDowngradeRatePct: numeric(data, 'maxStateDowngradeRatePct'),
        maxMeanAbsoluteScoreDelta: numeric(data, 'maxMeanAbsoluteScoreDelta'),
      },
    }, 'اكتمل Backtest المقارن وتم حفظه في السجل الدائم.');
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
    }, 'تم تسجيل Backtest اليدوي في السجل الدائم.');
  }

  function onDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const decision = String(data.get('decision') ?? '');
    void submit('/api/pilot/change-governance/decisions', {
      proposalId: decisionProposalId,
      backtestRunId: decisionProposal?.backtestRunId ?? null,
      decision,
      rationale: String(data.get('rationale') ?? ''),
    }, 'تم تسجيل قرار الحوكمة في السجل الدائم.');
  }

  return (
    <section className="ux-card" aria-labelledby="governance-write-title">
      <div className="ux-page-header">
        <div>
          <p className="ux-badge ux-badge--warning">Governed writes only</p>
          <h2 id="governance-write-title">إدارة دورة التغيير الخوارزمية</h2>
          <p>كل سجل Append-only. لا يوجد تطبيق تلقائي للسياسات أو الأوزان، وHard Gates لا يمكن تجاوزها بواسطة Backtest.</p>
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

        <form className="ux-card" onSubmit={onComparativeBacktest}>
          <h3>2. تشغيل Backtest مقارن آلي</h3>
          <p>متاح حاليًا للأوزان والحدود فقط. عند عدم كفاية التاريخ ستكون النتيجة INCONCLUSIVE تلقائيًا.</p>
          <label className="ux-field">المقترح
            <select className="ux-input" required value={compareProposalId} onChange={(event) => setCompareProposalId(event.target.value)}>
              <option value="" disabled>اختر مقترح أوزان أو حدود</option>
              {automatedEligible.map((item) => (
                <option key={item.proposalId} value={item.proposalId}>{item.title} · {item.target} · {item.candidateVersion}</option>
              ))}
            </select>
          </label>
          <label className="ux-field">بداية البيانات<input className="ux-input" type="date" name="datasetStartsAt" required /></label>
          <label className="ux-field">نهاية البيانات<input className="ux-input" type="date" name="datasetEndsAt" required /></label>
          <label className="ux-field">إعدادات النسخة المرشحة بصيغة JSON
            <textarea
              className="ux-input"
              name="candidateConfig"
              key={compareProposal?.target ?? 'none'}
              defaultValue={candidateExample(compareProposal?.target)}
              required
              rows={12}
            />
          </label>
          <label className="ux-field">الحد الأدنى لعدد العينات<input className="ux-input" type="number" name="minSampleCount" min={1} max={1000} required /></label>
          <label className="ux-field">أقصى نسبة خفض للحالة %<input className="ux-input" type="number" name="maxStateDowngradeRatePct" min={0} max={100} step="0.1" required /></label>
          <label className="ux-field">أقصى متوسط انحراف في الدرجة<input className="ux-input" type="number" name="maxMeanAbsoluteScoreDelta" min={0} max={100} step="0.1" required /></label>
          <button className="ux-button ux-button--primary" type="submit" disabled={busy || automatedEligible.length === 0}>تشغيل وحفظ المقارنة</button>
          <p>معايير القبول لا يضعها النظام تلقائيًا؛ يجب تحديدها صراحة لكل اختبار.</p>
        </form>

        <form className="ux-card" onSubmit={onBacktest}>
          <h3>3. تسجيل Backtest مخصص/يدوي</h3>
          <p>يُستخدم لتغييرات السياسة أو منطق المحرك أو عقود القياس التي لا يمكن إعادة تشغيلها حتميًا بعد.</p>
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
          <h3>4. تسجيل القرار</h3>
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
