import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getGovernanceCaseContract } from '@/repositories/governance-case-repository';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'مسودة', DATA_COLLECTION: 'جمع البيانات', ANALYSIS_IN_PROGRESS: 'قيد التحليل', READINESS_CHECK: 'فحص الجاهزية',
  NOT_READY_FOR_REVIEW: 'غير جاهزة للمراجعة', READY_FOR_REVIEW: 'جاهزة للمراجعة', IN_MEETING: 'قيد الاجتماع',
  DECISION_PENDING: 'بانتظار القرار', DECIDED: 'صدر القرار', EXECUTION_PENDING: 'بانتظار التنفيذ', MONITORING: 'قيد المتابعة',
  REVIEW_REQUIRED: 'تحتاج مراجعة', OUTCOME_ASSESSMENT: 'تقييم النتيجة', SETTLEMENT: 'التسوية', LEARNING_REVIEW: 'مراجعة التعلم',
  CLOSED: 'مغلقة', EARLY_WARNING: 'إنذار مبكر', PARTIAL_EXECUTION: 'تنفيذ جزئي', FAILED_EXECUTION: 'تعثر التنفيذ',
  REVALIDATION_REQUIRED: 'تحتاج إعادة تحقق', DATA_CONFLICT: 'تعارض بيانات', ESCALATED: 'مصعّدة', DEFERRED: 'مؤجلة', CASE_REOPENED: 'أعيد فتحها',
};

const ACTION_LABEL: Record<string, string> = {
  COLLECT_REQUIRED_DATA: 'استكمال البيانات المطلوبة', EVALUATE_READINESS: 'تقييم جاهزية القضية',
  RESOLVE_READINESS_BLOCKERS: 'معالجة موانع الجاهزية', GENERATE_OPTIONS: 'بناء البدائل', RANK_OPTIONS: 'ترتيب البدائل',
  CREATE_DECISION_DRAFT: 'إعداد مسودة القرار', REVIEW_AND_LOCK_DECISION: 'مراجعة القرار واعتماده', AWAIT_USER_DECISION: 'بانتظار قرارك',
  CREATE_USER_ACTION_REQUEST: 'إعداد طلب التنفيذ', AWAIT_USER_EXECUTION: 'بانتظار تنفيذك', SUBMIT_EXECUTION_EVIDENCE: 'إرفاق إثبات التنفيذ',
  VERIFY_EXECUTION_EVIDENCE: 'التحقق من إثبات التنفيذ', RUN_MONITORING: 'تشغيل المتابعة', ASSESS_OUTCOME: 'تقييم النتيجة',
  INITIALIZE_SETTLEMENT: 'بدء التسوية', COMPLETE_SETTLEMENT_ACTIONS: 'إكمال إجراءات التسوية', RECORD_LEARNING_REVIEW: 'تسجيل مراجعة التعلم', CLOSE_CASE: 'إغلاق القضية',
};

const OWNER_LABEL: Record<string, string> = { USER: 'أنت', SYSTEM: 'النظام', GOVERNANCE: 'الحوكمة', BANK_ENGINE: 'المحرك المختص' };

function display(value: string | null): string { return value ?? '—'; }

export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const user = await requireAuthenticatedUser();
  const { caseId } = await params;
  const item = await getGovernanceCaseContract(user.id, caseId).catch(() => null);
  if (!item) notFound();

  const nextAction = item.currentStatus === 'CLOSED'
    ? 'اكتملت دورة القضية'
    : item.nextActionCode ? (ACTION_LABEL[item.nextActionCode] ?? item.nextActionCode) : 'لا يوجد إجراء مطلوب الآن';

  return (
    <main className="app-page p47-decision-page" dir="rtl">
      <div className="page-shell p47-analysis-shell">
        <header className="p47-analysis-header">
          <div>
            <p className="eyebrow">تفاصيل القضية</p>
            <h1>{item.subject}</h1>
            <p className="muted">الحالة الحالية وما ينتظر المستخدم أو النظام تنفيذه في مسار القرار.</p>
          </div>
          <Link className="secondary-link" href="/cases">كل القضايا</Link>
        </header>

        <div className="p74-inline-metrics">
          <span>الحالة <b>{STATUS_LABEL[item.currentStatus] ?? item.currentStatus}</b></span>
          <span>الأولوية <b>{item.priority}</b></span>
          <span>نسخة القضية <b>{item.caseVersion}</b></span>
          <span>الجاهزية <b>{item.readinessScore == null ? '—' : `${item.readinessScore}%`}</b></span>
        </div>

        <section className="p47-analysis-card">
          <div className="p47-section-heading"><div><span>Next Action</span><h2>الإجراء التالي</h2></div></div>
          <div className="p47-empty-state">
            <strong>{nextAction}</strong>
            <span>المسؤول: {item.actionOwner ? (OWNER_LABEL[item.actionOwner] ?? item.actionOwner) : 'لا يوجد إجراء مطلوب'}</span>
          </div>
        </section>

        <section className="p47-analysis-card">
          <div className="p47-section-heading"><div><span>Decision Journey</span><h2>حالة دورة القرار</h2></div></div>
          <div className="p74-inline-metrics">
            <span>الجاهزية <b>{display(item.readinessStatus)}</b></span>
            <span>توليد البدائل <b>{display(item.optionGenerationStatus)}</b></span>
            <span>الترتيب <b>{display(item.rankingStatus)}</b></span>
            <span>القرار <b>{display(item.decisionStatus)}</b></span>
            <span>قرار المستخدم <b>{display(item.userDecisionStatus)}</b></span>
            <span>التنفيذ <b>{display(item.executionTaskStatus)}</b></span>
            <span>التحقق <b>{display(item.latestExecutionStatus)}</b></span>
            <span>المراقبة <b>{display(item.monitoringStatus)}</b></span>
            <span>النتيجة <b>{display(item.outcomeStatus)}</b></span>
            <span>التسوية <b>{display(item.settlementStatus)}</b></span>
            <span>التعلم <b>{display(item.learningReviewStatus)}</b></span>
          </div>
        </section>

        <section className="p47-analysis-card">
          <div className="p47-section-heading"><div><span>Evidence & Closure</span><h2>الإثبات والإغلاق</h2></div></div>
          <div className="p74-inline-metrics">
            <span>إثباتات معلقة <b>{item.pendingEvidenceCount}</b></span>
            <span>إثباتات مطابقة <b>{item.matchedEvidenceCount}</b></span>
            <span>أعلى تنبيه <b>{display(item.highestSeverity)}</b></span>
            <span>جاهزة للإغلاق <b>{item.readyToClose ? 'نعم' : 'لا'}</b></span>
          </div>
          {!item.readyToClose && item.closureBlockers.length > 0 ? (
            <details className="decision-details"><summary>عرض موانع الإغلاق</summary><pre className="decision-json">{JSON.stringify(item.closureBlockers, null, 2)}</pre></details>
          ) : null}
        </section>
      </div>
    </main>
  );
}
