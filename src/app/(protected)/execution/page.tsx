import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listOpenExecutionTasks } from '@/features/financial-engine/services/execution-service';
import { reportExecutionAction } from './actions';
import { PageHeader } from '@/components/ui';

const statusLabels:Record<string,string>={
  USER_ACTION_REQUEST:'بانتظار تنفيذك الخارجي',WAITING_USER_CONFIRMATION:'بانتظار تأكيدك',EVIDENCE_PENDING:'الإثبات قيد المراجعة',
  VERIFICATION_PENDING:'قيد التحقق',VERIFIED_EXECUTION:'تم التحقق من التنفيذ',RECONCILIATION:'فرق تسوية تحت التحقق',PARTIAL:'تنفيذ جزئي',
  FAILED:'تعذر التنفيذ',OVERDUE:'متأخر',DISPUTED:'محل مراجعة',CANNOT_REVERSE:'غير قابل للتراجع',
};
const actionLabels:Record<string,string>={
  TRANSFER:'تحويل',PAYMENT:'سداد',BILL_PAYMENT:'سداد فاتورة',SAVING_TRANSFER:'تحويل للادخار',
  EMERGENCY_CONTRIBUTION:'مساهمة في الطوارئ',EMERGENCY_WITHDRAWAL:'سحب طارئ',GOAL_CONTRIBUTION:'مساهمة لهدف',
  INVESTMENT:'استثمار',OTHER:'إجراء مالي',
};
const severityLabels:Record<string,string>={CRITICAL:'حرجة',HIGH:'عالية',WARNING:'تحتاج انتباه',MEDIUM:'متوسطة',INFO:'متابعة',LOW:'منخفضة'};
const currencyLabels:Record<string,string>={SAR:'ريال',USD:'دولار',EUR:'يورو'};
const formatDate=(value:string|Date)=>new Date(value).toLocaleDateString('ar-SA-u-nu-latn');

export default async function ExecutionPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const user=await requireAuthenticatedUser();
  const [tasks,q]=await Promise.all([listOpenExecutionTasks(user.id),searchParams]);
  const awaitingUser=tasks.filter(task=>['USER_ACTION_REQUEST','WAITING_USER_CONFIRMATION','OVERDUE'].includes(task.status)).length;
  const awaitingVerification=tasks.filter(task=>['EVIDENCE_PENDING','VERIFICATION_PENDING','RECONCILIATION'].includes(task.status)).length;
  const needsReview=tasks.filter(task=>['FAILED','DISPUTED','PARTIAL'].includes(task.status)||task.followupCaseStatus==='REVIEW_REQUIRED'||task.followupCaseStatus==='EARLY_WARNING').length;
  return <main className="page-shell p47-closure-page namaa-execution-page namaa-migrated-shell" dir="rtl">
    <PageHeader className="page-header p47-closure-header namaa-execution-header namaa-migrated-header" eyebrow="التنفيذ والمتابعة" title="مركز التنفيذ الخارجي والإثبات" description="نماء لا يحرك أموالك. نفّذ العملية في البنك أو الجهة الخارجية، ثم أكدها واربط الإثبات هنا." actions={<Link className="ux-button ux-button--secondary" href="/advisor">العودة للمستشار</Link>}/>
    {q.reported==='1'?<section className="card namaa-execution-card"><strong>تم استلام تأكيد التنفيذ.</strong><p className="muted">لن يعتبر النظام العملية منفذة نهائيًا حتى يكتمل التحقق من الإثبات والمطابقة.</p></section>:null}
    {q.error?<section className="card namaa-execution-card"><strong>تعذر تسجيل التأكيد: {q.error}</strong><p className="muted">لم يتم وسم العملية كتنفيذ متحقق.</p></section>:null}
    <section className="namaa-execution-summary" aria-label="ملخص التنفيذ"><article><span>بانتظار تنفيذك</span><strong>{awaitingUser}</strong></article><article><span>بانتظار التحقق</span><strong>{awaitingVerification}</strong></article><article><span>تحتاج مراجعة</span><strong>{needsReview}</strong></article><article><span>إجمالي المهام المفتوحة</span><strong>{tasks.length}</strong></article></section>
    <section className="card namaa-execution-card"><div className="row-between"><div><p className="eyebrow">المهام المفتوحة</p><h2>{tasks.length?`${tasks.length} مهمة تحتاج متابعة`:'لا توجد مهام تنفيذ مفتوحة'}</h2></div></div>
      {tasks.length===0?<p className="muted">عندما تعتمد قرارًا ماليًا من المستشار ستظهر مهمة التنفيذ هنا.</p>:<div>{tasks.map(task=><article className="card namaa-execution-task" key={task.id}>
        <div className="row-between"><div><strong>{actionLabels[task.actionType]??'إجراء مالي'}</strong><p className="muted">{statusLabels[task.status]??'قيد المتابعة'}</p></div>{task.amount?<strong>{task.amount} {currencyLabels[task.currency]??task.currency}</strong>:null}</div>
        {task.decisionReference?<p className="muted">مرجع القرار: <strong>{task.decisionReference}</strong></p>:null}
        {task.verificationStatus?<p className="muted">حالة الإثبات: <strong>{task.verificationStatus==='MATCHED'?'مطابقة نهائيًا':task.verificationStatus==='MISMATCH'?'فرق تسوية تحت التحقق':task.verificationStatus==='NEEDS_CLARIFICATION'?'تحتاج مراجعة مطابقة':task.verificationStatus==='PENDING'?'منفذة مبدئيًا وبانتظار المطابقة':task.verificationStatus}</strong></p>:null}
        {task.verificationReason?<p className="muted">سبب حالة الإثبات: {task.verificationReason==='EVIDENCE_FIELDS_INCOMPLETE'?'بيانات الإثبات غير مكتملة':task.verificationReason==='BANK_MATCH_NOT_AVAILABLE_YET'?'لم تظهر مطابقة بنكية نهائية بعد':task.verificationReason==='UNIQUE_BANK_STATEMENT_MATCH'?'تمت المطابقة النهائية وفق الضوابط الحاكمة':task.verificationReason==='MULTIPLE_BANK_STATEMENT_MATCHES'?'وجدت أكثر من حركة مرشحة وتحتاج مراجعة':task.verificationReason==='MATCH_CONFIDENCE_NOT_AVAILABLE'?'درجة مطابقة حاكمة غير متاحة بعد':task.verificationReason==='MATCH_CONFIDENCE_BELOW_THRESHOLD'?'درجة المطابقة لا تتجاوز الحد الحاكم':task.verificationReason==='MATERIAL_DIFFERENCE_REQUIRES_RECONCILIATION'?'ظهر فرق مادي غير مفسر ويحتاج تسوية':task.verificationReason}</p>:null}
        {task.followupCaseStatus?<p className="muted">متابعة القرار: <strong>{task.followupCaseStatus==='MONITORING'?'قيد قياس النتيجة':task.followupCaseStatus==='EARLY_WARNING'?'إنذار مبكر':task.followupCaseStatus==='REVIEW_REQUIRED'?'تحتاج مراجعة':task.followupCaseStatus==='OUTCOME_ASSESSMENT'?'تقييم النتيجة':task.followupCaseStatus}</strong></p>:null}
        {task.followupReviewDate?<p className="muted">موعد قياس النتيجة: <strong>{formatDate(task.followupReviewDate)}</strong></p>:null}
        {task.followupHighestSeverity?<p className="muted">أعلى إشارة متابعة: <strong>{severityLabels[task.followupHighestSeverity]??'متابعة'}</strong>{task.followupSignalCount?` — ${task.followupSignalCount} إشارة`:''}</p>:null}
        {task.instructions?<p>{task.instructions}</p>:null}
        {['USER_ACTION_REQUEST','WAITING_USER_CONFIRMATION','OVERDUE'].includes(task.status)?<form action={reportExecutionAction} className="namaa-execution-evidence-form">
          <input type="hidden" name="executionTaskId" value={task.id}/>
          {task.amount?<input type="hidden" name="reportedAmount" value={task.amount}/>:null}
          <label>نوع الإثبات<select name="evidenceType" defaultValue="REFERENCE"><option value="REFERENCE">مرجع عملية</option><option value="BANK_RECEIPT">إيصال بنكي</option><option value="TRANSFER_RECEIPT">إيصال تحويل</option><option value="BILL_RECEIPT">إيصال سداد</option><option value="STATEMENT">كشف حساب</option><option value="OTHER">إثبات آخر</option></select></label>
          <label>مرجع أو رابط الإثبات<input name="externalReference" required maxLength={500} placeholder="رقم المرجع أو رابط آمن للإثبات"/></label>
          <label>تاريخ العملية<input name="claimedDate" type="date" required/></label>
          <label>الحساب المصدر<input name="sourceAccountRef" required maxLength={500} placeholder="اسم الحساب أو المعرّف أو الآيبان"/></label>
          <label>الطرف المقابل أو الوصف المطابق<input name="counterpartyRef" maxLength={500} placeholder="اختياري عند وجود رقم مرجع واضح"/></label>
          <div className="inline-actions"><button type="submit">تأكيد أنني نفذت خارجيًا</button></div>
          <p className="muted">هذا التأكيد ينقل المهمة للتحقق فقط، ولا يعتبر العملية منفذة نهائيًا قبل اكتمال المطابقة.</p>
        </form>:<p className="muted">لا يلزم إجراء إضافي منك الآن؛ النظام ينتظر التحقق أو المطابقة.</p>}
      </article>)}</div>}
    </section>
  </main>;
}
