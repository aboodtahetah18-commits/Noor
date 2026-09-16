'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Item = {
  proposalId: string;
  title: string;
  candidateVersion: string;
  decisionId: string | null;
  decision: string | null;
  backtestOutcome: string | null;
  releaseId: string | null;
  releasedVersion: string | null;
  previousVersion: string | null;
  rolledBackAt: string | null;
};

async function postJson(path: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json().catch(() => ({ ok: false, error: 'INVALID_RESPONSE' }));
}

export function ReleaseRollbackPanel({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const releasable = useMemo(
    () => items.filter((item) => item.decision === 'APPROVED' && item.backtestOutcome === 'PASSED' && !item.releaseId),
    [items],
  );
  const rollbackable = useMemo(
    () => items.filter((item) => item.releaseId && !item.rolledBackAt),
    [items],
  );

  async function submit(path: string, body: unknown, success: string) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await postJson(path, body);
      setMessage(result.ok ? success : `تعذر الحفظ: ${result.error ?? 'UNKNOWN_ERROR'}`);
      if (result.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function onRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const proposalId = String(data.get('proposalId') ?? '');
    const item = releasable.find((row) => row.proposalId === proposalId);
    if (!item?.decisionId) return;
    void submit('/api/pilot/change-governance/releases', {
      proposalId,
      approvalDecisionId: item.decisionId,
      artifactText: String(data.get('artifactText') ?? ''),
    }, 'تم تسجيل الإصدار وربط هوية النسخة المعتمدة بالتشغيل المحكوم.');
  }

  function onRollback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void submit('/api/pilot/change-governance/rollbacks', {
      releaseId: String(data.get('releaseId') ?? ''),
      reason: String(data.get('reason') ?? ''),
    }, 'تم تسجيل Rollback وإعادة ربط التشغيل بالنسخة السابقة.');
  }

  return (
    <section className="ux-card" aria-labelledby="release-rollback-title">
      <div className="ux-page-header">
        <div>
          <p className="ux-badge ux-badge--warning">Governed runtime binding</p>
          <h2 id="release-rollback-title">الإصدار والرجوع</h2>
          <p>
            بعد الاعتماد والـBacktest، يسجل Release النسخة رسميًا ويربط معرف نسختها بالتشغيل بصورة محكومة وقابلة للرجوع. هذا لا ينفذ أي إجراء مالي للمستخدم، ولا يحول وصف Artifact النصي إلى أوزان أو منطق جديد بصورة تلقائية.
          </p>
        </div>
      </div>

      {message ? <p className="ux-alert">{message}</p> : null}

      <div className="ux-card-grid">
        <form className="ux-card" onSubmit={onRelease}>
          <h3>4. إصدار نسخة معتمدة</h3>
          <label className="ux-field">المقترح
            <select className="ux-input" name="proposalId" required defaultValue="">
              <option value="" disabled>اختر مقترحًا Approved + Passed</option>
              {releasable.map((item) => (
                <option key={item.proposalId} value={item.proposalId}>{item.title} · {item.candidateVersion}</option>
              ))}
            </select>
          </label>
          <label className="ux-field">وصف Artifact المعتمد
            <textarea className="ux-input" name="artifactText" required minLength={20} rows={5} />
          </label>
          <button className="ux-button ux-button--primary" type="submit" disabled={busy || releasable.length === 0}>تسجيل Release</button>
          <p>قاعدة البيانات تعيد التحقق من APPROVED وPASSED وسلسلة النسخة النشطة قبل السماح بالإصدار.</p>
        </form>

        <form className="ux-card" onSubmit={onRollback}>
          <h3>5. Rollback</h3>
          <label className="ux-field">الإصدار
            <select className="ux-input" name="releaseId" required defaultValue="">
              <option value="" disabled>اختر إصدارًا غير مُرجع</option>
              {rollbackable.map((item) => (
                <option key={item.releaseId ?? item.proposalId} value={item.releaseId ?? ''}>
                  {item.title} · {item.releasedVersion} → {item.previousVersion}
                </option>
              ))}
            </select>
          </label>
          <label className="ux-field">سبب الرجوع
            <textarea className="ux-input" name="reason" required minLength={20} rows={5} />
          </label>
          <button className="ux-button ux-button--secondary" type="submit" disabled={busy || rollbackable.length === 0}>تسجيل Rollback</button>
          <p>الرجوع لا يحذف الإصدار؛ يضيف حدثًا جديدًا ويعيد ربط النسخة السابقة مع الحفاظ على التاريخ الكامل.</p>
        </form>
      </div>
    </section>
  );
}
