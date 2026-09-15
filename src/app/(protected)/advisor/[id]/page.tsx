import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getRecommendationDetails } from '@/features/recommendations/queries/get-recommendation-details';
import { getRecommendationDecisionContext } from '@/features/financial-engine/queries/get-recommendation-decision-context';
import { acceptRecommendationAction, dismissRecommendationAction, respondRecommendationDecisionAction } from '../actions';

const statusLabels:Record<string,string>={NEW:'جديدة',VIEWED:'تمت المشاهدة',ACCEPTED:'مقبولة',DISMISSED:'مرفوضة',EXPIRED:'منتهية',RESOLVED:'تمت المعالجة'};
const decisionLabels:Record<string,string>={USER_DECISION_REQUIRED:'بانتظار قرارك',APPROVED:'معتمد',REJECTED:'مرفوض',DEFERRED:'مؤجل',REVALIDATION_REQUIRED:'يحتاج إعادة تحقق',BLOCKED_HARD_RULE:'محجوب بقاعدة صارمة'};

function displayReasonData(data: Record<string, unknown>) {
  const entries = Object.entries(data).filter(([,v]) => ['string','number','boolean'].includes(typeof v));
  if (!entries.length) return <p className="muted">لا توجد حقائق إضافية قابلة للعرض لهذه التوصية.</p>;
  return <dl>{entries.map(([k,v]) => <div key={k} className="row-between"><dt className="muted">{k}</dt><dd>{String(v)}</dd></div>)}</dl>;
}

export default async function RecommendationDetailsPage({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<Record<string,string|undefined>> }) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;
  const q = await searchParams;
  const details = await getRecommendationDetails(user.id, id);
  if (!details) notFound();
  const decision = await getRecommendationDecisionContext(user.id,id);
  const r = details.recommendation;
  const actionable = r.status === 'NEW' || r.status === 'VIEWED';
  return <main className="page-shell p47-closure-page" dir="rtl">
    <header className="page-header p47-closure-header"><div><p className="eyebrow">تفاصيل التوصية</p><div className="title-with-help"><h1>{r.title}</h1></div></div><Link className="button-link secondary" href="/advisor">رجوع للتوصيات</Link></header>
    {q.accepted==='1'?<section className="card"><strong>تم قبول التوصية وفتح مسار القرار.</strong><p className="muted">القبول لا ينفذ أي إجراء مالي. القرار المالي يحتاج اعتمادًا صريحًا أدناه.</p></section>:null}
    {q.error?<section className="card"><strong>تعذر إكمال الإجراء: {q.error}</strong><p className="muted">راجع حالة التوصية والبيانات ثم أعد المحاولة.</p></section>:null}
    <section className="card"><div className="row-between"><span>الحالة: <strong>{statusLabels[r.status]??r.status}</strong></span><span>الأولوية: {r.priority}</span></div><p className="muted">رمز السبب: {details.reasonCode}</p>{details.relatedEntity?<p>مرتبط بـ: <strong>{details.relatedEntity.label}</strong></p>:null}</section>
    <section className="card"><div className="row-between"><div><p className="eyebrow">لماذا ظهرت هذه التوصية؟</p><h2>{details.advisorExplanation.source==='ai'?'شرح المستشار':'الشرح الأساسي'}</h2></div><span className="status-pill">{details.advisorExplanation.source==='ai'?'شرح ذكي':'شرح أساسي'}</span></div><p>{details.advisorExplanation.text}</p>{details.advisorExplanation.advisorExplanationStatus==='unavailable'?<p className="muted">الشرح الذكي غير متاح حاليًا؛ التوصية والحسابات الأساسية ما زالت تعمل بصورة طبيعية.</p>:null}<details><summary>عرض الحقائق الداعمة</summary>{displayReasonData(details.reasonData)}<p className="muted">هذه هي الحقائق المنظمة التي يسمح النظام لطبقة الشرح باستخدامها.</p></details></section>
    <section className="card"><h2>الإجراءات المقترحة</h2><div className="inline-actions">{details.suggestedActions.map(a=><Link className="button-link secondary" key={a.code} href={a.href}>{a.label}</Link>)}</div></section>
    {actionable?<section className="card"><h2>قرارك بشأن التوصية</h2><div className="inline-actions"><form action={acceptRecommendationAction}><input type="hidden" name="recommendationId" value={r.id}/><button type="submit">قبول وفتح مسار القرار</button></form><form action={dismissRecommendationAction}><input type="hidden" name="recommendationId" value={r.id}/><button type="submit" className="secondary">تجاهل</button></form></div><p className="muted">قبول التوصية لا ينفذ عملية مالية؛ هو ينشئ طلب قرار محكوم بالقواعد والثقة.</p></section>:null}
    {decision.request?<section className="card"><div className="row-between"><div><p className="eyebrow">طلب القرار</p><h2>{decisionLabels[decision.request.status]??decision.request.status}</h2></div><span className="status-pill">{decision.request.materiality}</span></div>{decision.request.requestedAmount?<p>المبلغ محل القرار: <strong>{decision.request.requestedAmount} ر.س</strong></p>:null}
      {decision.request.status==='USER_DECISION_REQUIRED'?<><p>اعتمادك هنا يسمح بإنشاء مهمة تنفيذ لك، لكنه لا يحرك أي أموال تلقائيًا.</p><div className="inline-actions">
        <form action={respondRecommendationDecisionAction}><input type="hidden" name="recommendationId" value={r.id}/><input type="hidden" name="decisionRequestId" value={decision.request.id}/><input type="hidden" name="action" value="APPROVE"/><button type="submit">اعتماد القرار</button></form>
        <form action={respondRecommendationDecisionAction}><input type="hidden" name="recommendationId" value={r.id}/><input type="hidden" name="decisionRequestId" value={decision.request.id}/><input type="hidden" name="action" value="DEFER"/><button className="secondary" type="submit">تأجيل</button></form>
        <form action={respondRecommendationDecisionAction}><input type="hidden" name="recommendationId" value={r.id}/><input type="hidden" name="decisionRequestId" value={decision.request.id}/><input type="hidden" name="action" value="REJECT"/><button className="secondary" type="submit">رفض</button></form>
      </div></>:null}
      {decision.request.status==='REVALIDATION_REQUIRED'?<p className="muted">لا يمكن اعتماد القرار الحساس حاليًا قبل تحديث البيانات وإعادة التحقق من التوصية.</p>:null}
    </section>:null}
    {decision.executionTask?<section className="card"><p className="eyebrow">التنفيذ الخارجي</p><h2>مهمة التنفيذ: {decision.executionTask.status}</h2><p>{decision.executionTask.instructions}</p>{decision.executionTask.amount?<p>المبلغ: <strong>{decision.executionTask.amount} {decision.executionTask.currency}</strong></p>:null}<Link className="button-link secondary" href="/execution">فتح مركز التنفيذ والإثبات</Link></section>:null}
  </main>;
}
