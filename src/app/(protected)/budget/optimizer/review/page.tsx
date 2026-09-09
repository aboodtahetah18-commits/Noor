import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { WorkflowStageGuide } from '@/components/ux/workflow-stage-guide';
import { formatSar } from '@/lib/format-money';
import { getFinalPlanReview } from '@/features/plan-finalization/queries/get-final-plan-review';
import { approveFinalCyclePlanAction } from './actions';
import { Money } from '@/financial-engine/money';

const priorityLabel:Record<string,string>={BASIC:'أساسي',IMPORTANT:'مهم',FLEXIBLE:'مرن',DEFERRED:'مؤجل'};
const positive=(value:string)=>Money.parse(value).isPositive();

export default async function FinalPlanReviewPage({searchParams}:{searchParams:Promise<{error?:string;approved?:string}>}){
  const user=await requireAuthenticatedUser();
  const [data,q]=await Promise.all([getFinalPlanReview(user.id),searchParams]);
  if(!data) return <main className="app-page" dir="rtl"><section className="page-shell empty-state"><h1>لا توجد دورة مالية نشطة</h1><Link href="/cycles/new" className="primary-link">بدء دورة مالية</Link></section></main>;
  return <main className="app-page" dir="rtl"><section className="page-shell">
    <header className="page-header p47-closure-header"><div><p className="eyebrow">المراجعة النهائية · {data.cycle.name}</p><div className="title-with-help"><h1>اعتماد الخطة النهائية للدورة</h1></div></div><Link href="/budget/optimizer" className="secondary-button">العودة للتحسين</Link></header>
    <WorkflowStageGuide ariaLabel="مراحل اعتماد الخطة" stages={[
      {label:'1. مراجعة الأرقام',description:'الدخل والاحتياج والتخفيضات',state:'done'},
      {label:'2. مقارنة قبل وبعد',description:'تحقق من البنود المتغيرة',state:'current'},
      {label:'3. مراجعة الفائض',description:'تأكد من التوجيهات المختارة'},
      {label:'4. الاعتماد',description:'ثبّت الخطة بعد زوال الموانع'},
    ]}/>
    {q.error?<p className="error-banner" role="alert">{q.error}</p>:null}
    {q.approved?<p className="success-banner">تم اعتماد الخطة النهائية وحفظ نسخة مراجعة قابلة للتتبع.</p>:null}
    {q.approved&&data.latestApprovedFinalization?<section className="card"><div className="section-title-row"><div><h2>آخر اعتماد محفوظ</h2><p className="muted">تم حفظ لقطة الاعتماد حتى لا تضيع أسباب التغيير بعد انتقال المسودات إلى حالة «مطبق».</p></div><strong>{new Date(data.latestApprovedFinalization.approvedAt).toLocaleString('ar-SA')}</strong></div></section>:null}

    <section className="statement-kpis"><div><span>الدخل المتوقع</span><strong>{formatSar(data.expectedIncome)}</strong></div><div><span>الاحتياج قبل</span><strong>{formatSar(data.originalDemand)}</strong></div><div><span>التخفيضات الحالية قيد المراجعة</span><strong>{formatSar(data.approvedReductions)}</strong></div><div><span>الفائض الحالي</span><strong>{formatSar(data.surplus)}</strong></div></section>

    {positive(data.recoveryDemand)?<section className="card"><div className="section-title-row"><div><h2>التزامات الاسترداد داخل هذه الدورة</h2><p className="muted">هذه مبالغ محجوزة في القدرة المالية قبل التوزيع الاختياري، وليست تحويلات منفذة بعد.</p></div></div><div className="account-row"><span>أصل الاسترداد</span><strong>{formatSar(data.recoveryPrincipal)}</strong></div><div className="account-row"><span>زيادة الاسترداد</span><strong>{formatSar(data.recoveryGrowth)}</strong></div><div className="account-row"><span>الإجمالي المحجوز</span><strong>{formatSar(data.recoveryDemand)}</strong></div></section>:null}

    <section className="card"><div className="section-title-row"><h2>الخطة قبل / بعد</h2></div><div className="transaction-table-wrap"><table className="transaction-table"><thead><tr><th>البند</th><th>التصنيف</th><th>قبل</th><th>التخفيض</th><th>بعد</th></tr></thead><tbody>{data.categoryChanges.map(c=><tr key={c.categoryId}><td><strong>{c.label}</strong></td><td>{priorityLabel[c.priorityClass]??c.priorityClass}</td><td>{formatSar(c.before)}</td><td>{positive(c.reduction)?`- ${formatSar(c.reduction)}`:'—'}</td><td><strong>{formatSar(c.after)}</strong></td></tr>)}</tbody></table></div></section>

    <section className="card"><h2>توجيه الفائض الذي اخترته</h2>{data.routingRows.length===0?<p className="muted">لم تعتمد أي توجيه للفائض حتى الآن. الفائض غير الموجه سيبقى غير مخصص ولن ينقل تلقائيًا لأي حساب.</p>:<div className="p44-review-list">{data.routingRows.map(r=><div className="account-row" key={r.key}><div><strong>{r.label}</strong><span>{r.reason}</span></div><strong>{formatSar(r.amount)}</strong></div>)}</div>}<div className="account-row"><span>إجمالي التوجيه</span><strong>{formatSar(data.totalRouting)}</strong></div><div className="account-row"><span>فائض غير موجه</span><strong>{formatSar(data.unassignedSurplus)}</strong></div></section>

    {data.blockers.length?<section className="card"><h2>لا يمكن الاعتماد بعد</h2>{data.blockers.map(b=><p className="error-banner" key={b}>{b}</p>)}</section>:<section className="card"><h2>ما الذي سيحدث عند الاعتماد؟</h2><ul><li>إنشاء نسخة جديدة من الخطة فقط إذا كانت هناك تخفيضات بنود فعلية.</li><li>تثبيت التخفيضات التي اخترتها بدل بقائها تجربة.</li><li>تحويل توجيهات الفائض من مسودة إلى تخطيط معتمد، بدون تحويل مالي.</li><li>حفظ لقطة مراجعة كاملة حتى نعرف لاحقًا لماذا تغيرت الخطة.</li><li>أي فائض غير موجه يبقى كما هو، ولا يوزعه النظام من نفسه.</li></ul><form action={approveFinalCyclePlanAction}><button className="primary-button" type="submit">اعتماد الخطة النهائية</button></form></section>}
  </section></main>;
}
