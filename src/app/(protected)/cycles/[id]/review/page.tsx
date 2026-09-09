import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getCycleMonthlyReview } from '@/features/cycles/queries/get-cycle-monthly-review';
import { formatSar } from '@/lib/format-money';
import { WorkflowStageGuide } from '@/components/ux/workflow-stage-guide';
import { saveCycleMonthlyReviewAction, approveCycleMonthlyReviewAction, closeCycleAndPrepareNextAction, saveCategoryContextAction } from './actions';

const statusLabel:Record<string,string>={OVER:'متجاوز',UNDER:'أقل من المتوقع',ON_TRACK:'ضمن الخطة',UNUSED:'غير مستخدم'};
const actionLabel:Record<string,string>={KEEP:'استمرار',INCREASE:'زيادة',REDUCE:'خفض',PAUSE:'إيقاف مؤقت',ADD:'إضافة'};

export default async function CycleReviewPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {id}=await params;
  const query=await searchParams;
  const user=await requireAuthenticatedUser();
  const review=await getCycleMonthlyReview(user.id,id);
  if(!review)notFound();
  const over=review.categories.filter(c=>c.status==='OVER').length;
  const unused=review.categories.filter(c=>c.status==='UNUSED').length;
  return <main className="page-shell cycle-review-page" dir="rtl">
    <header className="page-header p47-closure-header">
      <div><p className="eyebrow">مراجعة الدورة</p><div className="title-with-help"><h1>مراجعة {review.cycle.name}</h1></div></div>
      <Link className="button-link" href={`/cycles/${id}`}>العودة للدورة</Link>
    </header>
    <WorkflowStageGuide ariaLabel="مراحل مراجعة وإغلاق الدورة" stages={[
      {label:'1. الجاهزية',description:'احسم العناصر البنكية أولًا',state:review.bank.ready?'done':'current'},
      {label:'2. مقارنة الخطة',description:'راجع المخطط مقابل الفعلي',state:review.bank.ready?'current':'next'},
      {label:'3. تفسير الانحرافات',description:'وثّق الاستثناءات المهمة'},
      {label:'4. اعتماد المراجعة',description:'ثبّت توصيات الدورة القادمة'},
      {label:'5. الإغلاق',description:'أنشئ الدورة التالية بعد الاعتماد'},
    ]}/>
    {query.saved==='1'?<section className="card success-zone"><strong>تم حفظ مسودة توصيات الدورة القادمة.</strong></section>:null}{query.contextSaved==='1'?<section className="card success-zone"><strong>تم حفظ تفسير الانحراف.</strong></section>:null}{query.contextError?<section className="card error-banner"><strong>{String(query.contextError)}</strong></section>:null}{query.approved==='1'?<section className="card success-zone"><strong>تم اعتماد مراجعة الدورة.</strong></section>:null}{query.approveError?<section className="card error-banner"><strong>{String(query.approveError)}</strong></section>:null}{query.closeError?<section className="card error-banner"><strong>{String(query.closeError)}</strong></section>:null}
    <section className="card">
      <div className="section-title-row"><h2>جاهزية الإغلاق</h2><span className="p44-badge">{review.bank.ready?'جاهز بنكيًا':'يحتاج مراجعة'}</span></div>
      <div className="statement-kpis p75-primary-metrics">
        <div><span>عمليات بنكية غير محسومة</span><strong>{review.bank.unresolved}</strong></div>
        <div><span>مصالحات غير مطابقة</span><strong>{review.bank.unmatched}</strong></div>
      </div>
      {!review.bank.ready?<p><Link href="/bank-statements">افتح مركز كشوف الحساب لمعالجة العناصر البنكية أولًا.</Link></p>:null}
    </section>
    {review.bank.ready?<>
    <section className="card">
      <div className="section-title-row"><h2>الخطة مقابل الفعلي</h2><div className="p75-inline-status"><span>متجاوزة <strong>{over}</strong></span><span>غير مستخدمة <strong>{unused}</strong></span></div></div>
      {review.categories.length===0?<div className="plan-empty-state">لا توجد بنود خطة نشطة لهذه الدورة.</div>:<div className="transaction-table-wrap"><table className="transaction-table"><thead><tr><th>البند</th><th>المخطط</th><th>الفعلي</th><th>الفرق</th><th>الحالة</th></tr></thead><tbody>{review.categories.map(c=><tr key={c.categoryId}><td data-label="البند">{c.name}</td><td data-label="المخطط">{formatSar(c.planned)}</td><td data-label="الفعلي">{formatSar(c.actual)}</td><td data-label="الفرق">{formatSar(c.variance)}</td><td data-label="الحالة"><span className="statement-status">{statusLabel[c.status]}</span></td></tr>)}</tbody></table></div>}
    </section>
    {review.categories.some(c=>c.needsExplanation)?<section className="card">
      <div className="section-title-row"><h2>فسّر الانحرافات المهمة</h2></div>
      <div className="p44-review-list">{review.categories.filter(c=>c.needsExplanation).map(c=><form className="form-card" action={saveCategoryContextAction} key={c.categoryId}>
        <input type="hidden" name="cycleId" value={id}/><input type="hidden" name="categoryId" value={c.categoryId}/><input type="hidden" name="direction" value={c.status==='OVER'?'HIGHER':'LOWER'}/><div className="section-title-row"><div><strong>{c.name}</strong><div className="muted">المخطط {formatSar(c.planned)} · الفعلي {formatSar(c.actual)} · الانحراف {c.variancePercent?.toFixed(1)}%</div></div></div>
        <div className="form-grid"><label>السبب<select name="reasonCodes" defaultValue="TEMPORARY_CHANGE"><option value="VACATION">إجازة</option><option value="TRAVEL">سفر</option><option value="WORK_AWAY">عمل خارج المنطقة</option><option value="WITH_FAMILY">إقامة/زيارة عند الأهل</option><option value="OCCASION">مناسبة</option><option value="GUESTS">ضيوف</option><option value="MAINTENANCE">صيانة</option><option value="FAMILY_CIRCUMSTANCE">ظرف عائلي</option><option value="HEALTH">ظرف صحي</option><option value="EXCEPTIONAL_PURCHASE">شراء استثنائي</option><option value="TEMPORARY_CHANGE">تغير مؤقت</option><option value="PERMANENT_CHANGE">تغير دائم</option><option value="OTHER">سبب آخر</option></select></label><label>طبيعة السبب<select name="persistence" defaultValue="TEMPORARY"><option value="TEMPORARY">مؤقت</option><option value="RECURRING">متكرر / موسمي</option><option value="PERMANENT">دائم</option></select></label><label>الموسم<select name="seasonCode" defaultValue=""><option value="">لا يوجد</option><option value="RAMADAN">رمضان</option><option value="EID_FITR">عيد الفطر</option><option value="EID_ADHA">عيد الأضحى</option><option value="SUMMER_HOLIDAY">الإجازة الصيفية</option><option value="BACK_TO_SCHOOL">العودة للمدارس</option><option value="TRAVEL_SEASON">موسم السفر</option><option value="WINTER">الشتاء</option><option value="SUMMER">الصيف</option><option value="CUSTOM">موسم مخصص</option></select></label><label>تفصيل إضافي<input name="customReason" maxLength={500}/></label></div><label className="full">اسم الموسم المخصص<input name="customSeasonName" maxLength={120}/></label><label className="checkbox-row"><input type="checkbox" name="useForNextPlan" defaultChecked/>استخدم هذا التفسير عند تحليل الخطة القادمة</label><button className="secondary-button" type="submit">حفظ التفسير</button>
      </form>)}</div>
    </section>:null}
    <section className="card">
      <div className="section-title-row"><h2>مسودة الدورة القادمة</h2></div>
      <form action={saveCycleMonthlyReviewAction}>
        <input type="hidden" name="cycleId" value={id}/>
        <div className="p44-review-list">{review.recommendations.map((r,i)=><div className="form-card" key={`${r.categoryId}-${i}`}><div className="section-title-row"><div><strong>{r.name}</strong></div><span className="p44-badge">{formatSar(r.currentAmount)}</span></div><div className="form-grid"><label>قرار الدورة القادمة<select name={`action_${i}`} defaultValue={r.action}>{Object.entries(actionLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>المبلغ المقترح<input name={`amount_${i}`} inputMode="decimal" defaultValue={r.suggestedAmount}/></label></div></div>)}</div>
        <label className="full">ملاحظات الدورة القادمة<textarea name="notes" rows={3} maxLength={2000} defaultValue={review.saved?.notes??''}/></label>
        <div className="button-row"><button className="secondary-button" type="submit" formAction={saveCycleMonthlyReviewAction}>حفظ كمسودة</button><button className="primary-button" type="submit" formAction={approveCycleMonthlyReviewAction} disabled={!review.bank.ready}>اعتماد المراجعة</button></div>
      </form>
    </section>
    {review.saved?.status==='REVIEWED'?<section className="card ux-action-zone ux-action-zone--critical">
      <div className="section-title-row"><h2>إغلاق الدورة والانتقال للتالية</h2></div>
      <form action={closeCycleAndPrepareNextAction}><input type="hidden" name="cycleId" value={id}/><button className="primary-button" type="submit">إغلاق الدورة وإنشاء الدورة القادمة</button></form>
    </section>:null}
    </>:null}
  </main>;
}
