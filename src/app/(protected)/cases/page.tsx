import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listGovernanceCaseContracts, type GovernanceCaseContract } from '@/repositories/governance-case-repository';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'مسودة',
  DATA_COLLECTION: 'جمع البيانات',
  ANALYSIS_IN_PROGRESS: 'قيد التحليل',
  READINESS_CHECK: 'فحص الجاهزية',
  NOT_READY_FOR_REVIEW: 'غير جاهزة للمراجعة',
  READY_FOR_REVIEW: 'جاهزة للمراجعة',
  IN_MEETING: 'قيد الاجتماع',
  DECISION_PENDING: 'بانتظار القرار',
  DECIDED: 'صدر القرار',
  EXECUTION_PENDING: 'بانتظار التنفيذ',
  MONITORING: 'قيد المتابعة',
  REVIEW_REQUIRED: 'تحتاج مراجعة',
  OUTCOME_ASSESSMENT: 'تقييم النتيجة',
  SETTLEMENT: 'التسوية',
  LEARNING_REVIEW: 'مراجعة التعلم',
  CLOSED: 'مغلقة',
  EARLY_WARNING: 'إنذار مبكر',
  PARTIAL_EXECUTION: 'تنفيذ جزئي',
  FAILED_EXECUTION: 'تعثر التنفيذ',
  REVALIDATION_REQUIRED: 'تحتاج إعادة تحقق',
  DATA_CONFLICT: 'تعارض بيانات',
  ESCALATED: 'مصعّدة',
  DEFERRED: 'مؤجلة',
  CASE_REOPENED: 'أعيد فتحها',
};

const ACTION_LABEL: Record<string, string> = {
  COLLECT_REQUIRED_DATA: 'استكمال البيانات المطلوبة',
  EVALUATE_READINESS: 'تقييم جاهزية القضية',
  RESOLVE_READINESS_BLOCKERS: 'معالجة موانع الجاهزية',
  GENERATE_OPTIONS: 'بناء البدائل',
  RANK_OPTIONS: 'ترتيب البدائل',
  CREATE_DECISION_DRAFT: 'إعداد مسودة القرار',
  REVIEW_AND_LOCK_DECISION: 'مراجعة القرار واعتماده',
  AWAIT_USER_DECISION: 'بانتظار قرارك',
  CREATE_USER_ACTION_REQUEST: 'إعداد طلب التنفيذ',
  AWAIT_USER_EXECUTION: 'بانتظار تنفيذك',
  SUBMIT_EXECUTION_EVIDENCE: 'إرفاق إثبات التنفيذ',
  VERIFY_EXECUTION_EVIDENCE: 'التحقق من إثبات التنفيذ',
  RUN_MONITORING: 'تشغيل المتابعة',
  ASSESS_OUTCOME: 'تقييم النتيجة',
  INITIALIZE_SETTLEMENT: 'بدء التسوية',
  COMPLETE_SETTLEMENT_ACTIONS: 'إكمال إجراءات التسوية',
  RECORD_LEARNING_REVIEW: 'تسجيل مراجعة التعلم',
  CLOSE_CASE: 'إغلاق القضية',
};

const OWNER_LABEL: Record<string, string> = {
  USER: 'أنت',
  SYSTEM: 'النظام',
  GOVERNANCE: 'الحوكمة',
  BANK_ENGINE: 'المحرك المختص',
};

function readinessLabel(value: string | null): string {
  if (value === 'READY') return 'جاهزة';
  if (value === 'READY_WITH_WARNINGS') return 'جاهزة مع تنبيهات';
  if (value === 'NOT_READY') return 'غير جاهزة';
  return 'لم تُقيّم بعد';
}

function severityLabel(value: string | null): string {
  if (value === 'CRITICAL') return 'حرج';
  if (value === 'WARNING') return 'تحذير';
  if (value === 'WATCH') return 'تحت المراقبة';
  if (value === 'INFO') return 'معلومة';
  return 'طبيعي';
}

function nextAction(caseItem: GovernanceCaseContract): string {
  if (caseItem.currentStatus === 'CLOSED') return 'اكتملت دورة القضية';
  if (!caseItem.nextActionCode) return 'لا يوجد إجراء مطلوب الآن';
  return ACTION_LABEL[caseItem.nextActionCode] ?? caseItem.nextActionCode;
}

export default async function CasesPage() {
  const user = await requireAuthenticatedUser();
  const cases = await listGovernanceCaseContracts(user.id, 100);
  const active = cases.filter((item) => item.currentStatus !== 'CLOSED');
  const userActions = active.filter((item) => item.actionOwner === 'USER');
  const warnings = active.filter((item) => item.highestSeverity === 'WARNING' || item.highestSeverity === 'CRITICAL' || item.currentStatus === 'EARLY_WARNING');

  return (
    <main className="app-page p47-decision-page" dir="rtl">
      <div className="page-shell p47-analysis-shell">
        <header className="p47-analysis-header">
          <div>
            <p className="eyebrow">القضايا والقرارات</p>
            <h1>مسار القرار المالي</h1>
            <p className="muted">متابعة كل قضية من جمع البيانات حتى التنفيذ والتسوية والإغلاق.</p>
          </div>
          <Link className="secondary-link" href="/decision-log">سجل القرارات</Link>
        </header>

        <div className="p74-inline-metrics">
          <span>القضايا النشطة <b>{active.length}</b></span>
          <span>تحتاج إجراءً منك <b>{userActions.length}</b></span>
          <span>تحت تنبيه <b>{warnings.length}</b></span>
          <span>إجمالي القضايا <b>{cases.length}</b></span>
        </div>

        <section className="p47-analysis-card">
          <div className="p47-section-heading">
            <div><span>Case Journey</span><h2>القضايا الحالية</h2></div>
            <small>{active.length} نشطة</small>
          </div>

          {cases.length === 0 ? (
            <div className="p47-empty-state">
              <strong>لا توجد قضايا مالية مفتوحة الآن</strong>
              <span>عند فتح قضية أو بدء مسار قرار ستظهر هنا حالتها والخطوة التالية.</span>
            </div>
          ) : (
            <div className="p47-decision-feed">
              {cases.map((item) => (
                <article className="p47-decision-item" key={item.caseId}>
                  <div className="p47-decision-time">
                    <span>الأولوية {item.priority}</span>
                    <small>نسخة {item.caseVersion}</small>
                  </div>

                  <div className="p47-decision-body">
                    <div className="p47-chip-row">
                      <span>{STATUS_LABEL[item.currentStatus] ?? item.currentStatus}</span>
                      <span>{readinessLabel(item.readinessStatus)}</span>
                      {item.highestSeverity ? <span>{severityLabel(item.highestSeverity)}</span> : null}
                    </div>
                    <h3>{item.subject}</h3>
                    <p>الخطوة التالية: {nextAction(item)}</p>
                    <p>المسؤول الآن: {item.actionOwner ? (OWNER_LABEL[item.actionOwner] ?? item.actionOwner) : 'لا يوجد إجراء مطلوب'}</p>
                    {item.readinessScore != null ? <p>درجة الجاهزية: <span className="rtl-number">{item.readinessScore}%</span></p> : null}
                  </div>

                  <div className="p47-decision-impact">
                    <strong>{item.caseType}</strong>
                    <Link href={`/cases/${item.caseId}`}>فتح القضية</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
