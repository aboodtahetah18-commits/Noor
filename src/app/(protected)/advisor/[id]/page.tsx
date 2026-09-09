import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getRecommendationDetails } from '@/features/recommendations/queries/get-recommendation-details';
import { acceptRecommendationAction, dismissRecommendationAction } from '../actions';

const statusLabels:Record<string,string>={NEW:'جديدة',VIEWED:'تمت المشاهدة',ACCEPTED:'مقبولة',DISMISSED:'مرفوضة',EXPIRED:'منتهية',RESOLVED:'تمت المعالجة'};

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
  const r = details.recommendation;
  const actionable = r.status === 'NEW' || r.status === 'VIEWED';
  return <main className="page-shell p47-closure-page" dir="rtl">
    <header className="page-header p47-closure-header"><div><p className="eyebrow">تفاصيل التوصية</p><div className="title-with-help"><h1>{r.title}</h1></div></div><Link className="button-link secondary" href="/advisor">رجوع للتوصيات</Link></header>
    {q.accepted==='1'?<section className="card"><strong>تم قبول التوصية.</strong><p className="muted">القبول لا ينفذ أي إجراء مالي تلقائيًا. اختر الإجراء التالي المناسب أدناه.</p></section>:null}
    <section className="card"><div className="row-between"><span>الحالة: <strong>{statusLabels[r.status]??r.status}</strong></span><span>الأولوية: {r.priority}</span></div><p className="muted">رمز السبب: {details.reasonCode}</p>{details.relatedEntity?<p>مرتبط بـ: <strong>{details.relatedEntity.label}</strong></p>:null}</section>
    <section className="card"><div className="row-between"><div><p className="eyebrow">لماذا ظهرت هذه التوصية؟</p><h2>{details.advisorExplanation.source==='ai'?'شرح المستشار':'الشرح الأساسي'}</h2></div><span className="status-pill">{details.advisorExplanation.source==='ai'?'شرح ذكي':'شرح أساسي'}</span></div><p>{details.advisorExplanation.text}</p>{details.advisorExplanation.advisorExplanationStatus==='unavailable'?<p className="muted">الشرح الذكي غير متاح حاليًا؛ التوصية والحسابات الأساسية ما زالت تعمل بصورة طبيعية.</p>:null}<details><summary>عرض الحقائق الداعمة</summary>{displayReasonData(details.reasonData)}<p className="muted">هذه هي الحقائق المنظمة التي يسمح النظام لطبقة الشرح باستخدامها.</p></details></section>
    <section className="card"><h2>الإجراءات المقترحة</h2><div className="inline-actions">{details.suggestedActions.map(a=><Link className="button-link secondary" key={a.code} href={a.href}>{a.label}</Link>)}</div></section>
    {actionable?<section className="card"><h2>قرارك</h2><div className="inline-actions"><form action={acceptRecommendationAction}><input type="hidden" name="recommendationId" value={r.id}/><button type="submit">قبول التوصية</button></form><form action={dismissRecommendationAction}><input type="hidden" name="recommendationId" value={r.id}/><button type="submit" className="secondary">تجاهل</button></form></div><p className="muted">قبول التوصية لا ينفذ أي عملية مالية؛ هو يسجل قرارك فقط ولا يحرك أموالًا ولا يعدل الخطة تلقائيًا.</p></section>:null}
  </main>;
}
