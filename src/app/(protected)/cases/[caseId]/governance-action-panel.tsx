import type { GovernanceActionCapabilities } from '@/features/governance/services/get-governance-action-capabilities';
import {
  decideChangeProposalAction,
  decideRollbackReviewAction,
  executeGovernedRollbackAction,
  releaseGovernedChangeAction,
} from './actions';

const MESSAGE: Record<string, string> = {
  CHANGE_PROPOSAL_APPROVED: 'تم اعتماد المقترح الحوكمي بعد إعادة التحقق من الصلاحيات.',
  CHANGE_PROPOSAL_REJECTED: 'تم رفض المقترح الحوكمي وتسجيل القرار.',
  ROLLBACK_REVIEW_APPROVED: 'تم اعتماد مراجعة التراجع. لا يتم التراجع تلقائيًا؛ يلزم إجراء Rollback مستقل.',
  ROLLBACK_REVIEW_REJECTED: 'تم رفض مراجعة التراجع وتسجيل القرار.',
  GOVERNED_RELEASE_CREATED: 'تم تسجيل الإصدار المحكوم في السجل الرسمي.',
  GOVERNED_ROLLBACK_CREATED: 'تم تسجيل التراجع المحكوم إلى previous_version الرسمية.',
  GOVERNANCE_ACTION_FAILED: 'تعذر تنفيذ الإجراء الحوكمي. راجع الحالة والصلاحيات ثم أعد المحاولة.',
  GOVERNANCE_ACTION_INVALID: 'طلب الإجراء غير صالح.',
  GOVERNANCE_RATIONALE_REQUIRED: 'التعليل إلزامي لهذا الإجراء.',
  RELEASE_EXPLICIT_CONFIRMATION_REQUIRED: 'يجب تأكيد الإصدار صراحةً.',
  ROLLBACK_EXPLICIT_CONFIRMATION_REQUIRED: 'يجب تأكيد التراجع صراحةً.',
  CASE_RELEASE_NOT_READY: 'الإصدار غير جاهز: يجب توفر Candidate محفوظ وBacktest ناجح واعتماد صالح.',
  CASE_RELEASE_EVIDENCE_MISMATCH: 'توقفت العملية بسبب عدم تطابق Evidence مع القضية.',
  ALGORITHM_ROLLBACK_REQUIRES_APPROVED_REVIEW: 'لا يمكن التراجع قبل اعتماد Rollback Review المطابقة.',
};

function humanMessage(code?: string): string | null {
  if (!code) return null;
  if (code.startsWith('AUTHORIZATION_DENIED:')) return 'لا تسمح صلاحياتك الحالية بهذا الإجراء ضمن هذا النطاق.';
  return MESSAGE[code] ?? code;
}

export function GovernanceActionPanel({
  caseId,
  capabilities,
  status,
  message,
}: {
  caseId: string;
  capabilities: GovernanceActionCapabilities;
  status?: string;
  message?: string;
}) {
  const anyAction = Object.values(capabilities).some(Boolean);
  const feedback = humanMessage(message);

  return (
    <section className="p47-analysis-card" aria-labelledby="governance-actions-title">
      <div className="p47-section-heading">
        <div><span>Authorized Actions</span><h2 id="governance-actions-title">الإجراءات الحوكمية المصرح بها</h2></div>
        <small>يُعاد التحقق من RBAC/ABAC على الخادم عند التنفيذ</small>
      </div>

      {feedback ? (
        <p role="status" className={status === 'success' ? 'muted' : 'form-error'}>{feedback}</p>
      ) : null}

      {!anyAction ? (
        <div className="p47-empty-state">
          <strong>لا يوجد إجراء حوكمي متاح لك الآن</strong>
          <span>قد يكون السبب حالة الدورة الحالية أو عدم وجود Grant صريح مطابق للنطاق. DENY هو الوضع الافتراضي.</span>
        </div>
      ) : null}

      {(capabilities.approveProposal || capabilities.rejectProposal) ? (
        <form action={decideChangeProposalAction} className="ndos-form-grid">
          <input type="hidden" name="caseId" value={caseId} />
          <label>
            <span>تعليل قرار المقترح</span>
            <textarea name="rationale" required maxLength={4000} placeholder="سجّل سبب الاعتماد أو الرفض بصورة قابلة للتدقيق." />
          </label>
          <div className="ndos-actions">
            {capabilities.approveProposal ? <button className="primary-button" name="decision" value="APPROVED" type="submit">اعتماد المقترح</button> : null}
            {capabilities.rejectProposal ? <button className="secondary-button" name="decision" value="REJECTED" type="submit">رفض المقترح</button> : null}
          </div>
        </form>
      ) : null}

      {capabilities.release ? (
        <form action={releaseGovernedChangeAction} className="ndos-form-grid">
          <input type="hidden" name="caseId" value={caseId} />
          <label>
            <input type="checkbox" name="confirm" value="RELEASE" required />
            <span>أؤكد إنشاء Release رسمي من Candidate وEvidence المحفوظين في السجل. هذا لا ينفذ أي فعل مالي خارجي.</span>
          </label>
          <div className="ndos-actions"><button className="primary-button" type="submit">إنشاء Release محكوم</button></div>
        </form>
      ) : null}

      {(capabilities.approveRollbackReview || capabilities.rejectRollbackReview) ? (
        <form action={decideRollbackReviewAction} className="ndos-form-grid">
          <input type="hidden" name="caseId" value={caseId} />
          <label>
            <span>تعليل قرار مراجعة التراجع</span>
            <textarea name="rationale" required maxLength={4000} placeholder="وضح سبب قبول أو رفض التراجع المقترح." />
          </label>
          <div className="ndos-actions">
            {capabilities.approveRollbackReview ? <button className="primary-button" name="decision" value="APPROVED" type="submit">اعتماد مراجعة التراجع</button> : null}
            {capabilities.rejectRollbackReview ? <button className="secondary-button" name="decision" value="REJECTED" type="submit">رفض مراجعة التراجع</button> : null}
          </div>
        </form>
      ) : null}

      {capabilities.rollback ? (
        <form action={executeGovernedRollbackAction} className="ndos-form-grid">
          <input type="hidden" name="caseId" value={caseId} />
          <label>
            <span>سبب تنفيذ التراجع</span>
            <textarea name="rationale" required maxLength={4000} placeholder="سجّل سبب تنفيذ التراجع بعد اعتماد المراجعة." />
          </label>
          <label>
            <input type="checkbox" name="confirm" value="ROLLBACK" required />
            <span>أؤكد التراجع فقط إلى previous_version المسجلة في نفس Release، مع الاحتفاظ بكامل التاريخ.</span>
          </label>
          <div className="ndos-actions"><button className="secondary-button" type="submit">تنفيذ Rollback المحكوم</button></div>
        </form>
      ) : null}
    </section>
  );
}
