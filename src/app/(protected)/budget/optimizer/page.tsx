import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { WorkflowStageGuide } from '@/components/ux/workflow-stage-guide';
import { formatSar } from '@/lib/format-money';
import { getSalaryAllocationOptimizer } from '@/features/budget-optimizer/queries/get-salary-allocation-optimizer';
import { saveOptimizerReductionAction,updateCategoryPriorityAction } from './actions';
import { saveSurplusRoutingDraftAction } from './surplus-actions';
import { getSurplusRouting } from '@/features/surplus-routing/queries/get-surplus-routing';
import { Money } from '@/financial-engine/money';

const priorityLabel:Record<string,string>={BASIC:'أساسي',IMPORTANT:'مهم',FLEXIBLE:'مرن',DEFERRED:'مؤجل'};
const kindLabel:Record<string,string>={CATEGORY:'بند',GOAL:'هدف بتاريخ',EMERGENCY_RECOVERY:'استرداد طوارئ',INVESTMENT_RECOVERY:'استرداد استثمار'};
const positive=(value:string)=>Money.parse(value).isPositive();

export default async function BudgetOptimizerPage({searchParams}:{searchParams:Promise<{error?:string;saved?:string;priority?:string;routeError?:string;routeSaved?:string}>}){
  const user=await requireAuthenticatedUser();
  const [data,routing,q]=await Promise.all([getSalaryAllocationOptimizer(user.id),getSurplusRouting(user.id),searchParams]);
  if(!data) return <main className="app-page" dir="rtl"><section className="page-shell empty-state"><h1>لا توجد دورة مالية نشطة</h1><Link className="primary-link" href="/cycles/new">بدء دورة مالية</Link></section></main>;
  const deficitItems=data.items.filter(i=>positive(i.uncovered));
  return <main className="app-page" dir="rtl"><section className="page-shell">
    <header className="page-header p47-closure-header"><div><p className="eyebrow">التخطيط والتمويل · {data.cycle.name}</p><div className="title-with-help"><h1>توزيع الراتب ومعالجة العجز</h1></div></div><Link href="/budget" className="button-link">الخطة</Link></header>
    <WorkflowStageGuide ariaLabel="مراحل تحسين الخطة" stages={[
      {label:'1. فهم العجز',description:'حدد البنود غير المغطاة',state:positive(data.deficit)?'current':'done'},
      {label:'2. تجربة التخفيضات',description:'اختبر الأثر بدون اعتماد',state:positive(data.deficit)?'current':'done'},
      {label:'3. توجيه الفائض',description:'يظهر بعد الوصول لعجز صفر',state:!positive(data.deficit)?'current':'next'},
      {label:'4. المراجعة النهائية',description:'قارن قبل وبعد ثم اعتمد'},
    ]}/>
    {q.error?<p className="error-banner" role="alert">{q.error}</p>:null}{q.saved?<p className="success-banner">تم حفظ التخفيض كتجربة فقط، وأعيد حساب العجز.</p>:null}{q.priority?<p className="success-banner">تم تحديث تصنيف البند.</p>:null}{q.routeError?<p className="error-banner" role="alert">{q.routeError}</p>:null}{q.routeSaved?<p className="success-banner">تم حفظ توزيع الفائض كتخطيط فقط، بدون أي تحويل مالي.</p>:null}
    <section className="statement-kpis p75-primary-metrics"><div><span>الدخل المتوقع</span><strong>{formatSar(data.expectedIncome)}</strong></div><div><span>احتياج الخطة</span><strong>{formatSar(data.adjustedDemand)}</strong></div><div><span>{positive(data.deficit)?'العجز المتبقي':'الفائض الحالي'}</span><strong>{formatSar(positive(data.deficit)?data.deficit:data.surplus)}</strong></div></section>

    {positive(data.recoveryDemand)?<details className="ux-progressive-disclosure"><summary>تفاصيل استرداد التمويل الداخلي المحجوز</summary><div className="ux-progressive-disclosure__content"><section className="card"><div className="section-title-row"><div><h2>استرداد التمويل الداخلي المحجوز لهذه الدورة</h2></div></div><section className="statement-kpis"><div><span>إجمالي الاسترداد</span><strong>{formatSar(data.recoveryDemand)}</strong></div><div><span>أصل المبالغ</span><strong>{formatSar(data.recoveryPrincipal)}</strong></div><div><span>الزيادة</span><strong>{formatSar(data.recoveryGrowth)}</strong></div><div><span>عدد المصادر المستحقة</span><strong>{data.recoveryReservations.length}</strong></div></section><div className="p44-review-list">{data.recoveryReservations.map(r=><div className="account-row" key={`${r.sourceId}:${r.installmentNumber}`}><div><strong>{r.sourceType==='EMERGENCY'?'الطوارئ':'الاستثمار'} · {r.caseTitle}</strong><span>دفعة {r.installmentNumber} · أصل {formatSar(r.principalAmount)} + زيادة {formatSar(r.growthAmount)}{r.isOverdue?' · متأخرة من دورة سابقة':''}</span></div><strong>{formatSar(r.totalAmount)}</strong></div>)}</div></section></div></details>:null}

    {positive(data.deficit)?<>
    <section className="card"><div className="section-title-row"><h2>خريطة العجز</h2></div>
      {!positive(data.deficit)?<div className="success-banner">لا يوجد عجز حاليًا. يمكنك رغم ذلك تقليل البنود التي تستطيع الاستغناء عن جزء منها لزيادة الفائض.</div>:<><p>العجز الحالي <strong>{formatSar(data.deficit)}</strong>، وهو موزع على العناصر التالية:</p><div className="transaction-table-wrap"><table className="transaction-table"><thead><tr><th>العنصر</th><th>النوع</th><th>التصنيف</th><th>غير المغطى</th></tr></thead><tbody>{deficitItems.map(i=><tr key={i.key}><td><strong>{i.label}</strong></td><td>{kindLabel[i.kind]}</td><td>{priorityLabel[i.priorityClass]}</td><td><strong>{formatSar(i.uncovered)}</strong></td></tr>)}</tbody></table></div></>}
    </section>

    <section className="card"><div className="section-title-row"><h2>معالجة البنود</h2></div><div className="p44-review-list">{data.items.map(item=><section className="form-card" key={item.key}><div className="section-title-row"><div><strong>{item.label}</strong><div className="muted">{kindLabel[item.kind]} · {priorityLabel[item.priorityClass]}</div></div><div><strong>{formatSar(item.amount)}</strong><small className="muted">المطلوب</small></div></div>{positive(item.uncovered)?<p className="error-banner">هذا العنصر يحمل حاليًا {formatSar(item.uncovered)} من العجز.</p>:null}
      {item.kind==='CATEGORY'&&item.categoryId?<><form action={updateCategoryPriorityAction} className="inline-form"><input type="hidden" name="categoryId" value={item.categoryId}/><label>التصنيف<select name="priorityClass" defaultValue={item.priorityClass}><option value="BASIC">أساسي</option><option value="IMPORTANT">مهم</option><option value="FLEXIBLE">مرن</option><option value="DEFERRED">مؤجل</option></select></label><button className="secondary-button" type="submit">تحديث التصنيف</button></form><form action={saveOptimizerReductionAction} className="inline-form"><input type="hidden" name="categoryId" value={item.categoryId}/><label>ما المبلغ الذي تستطيع تقليله؟<input name="amount" inputMode="decimal" defaultValue={positive(item.currentReduction)?item.currentReduction:''} placeholder="مثال: 25"/></label><button className="primary-button" type="submit">إعادة الحساب</button></form></>:null}
    </section>)}</div></section>

    <section className="card"><h2>النتيجة الحالية</h2><div className="account-row"><span>الاحتياج بعد التخفيضات</span><strong>{formatSar(data.adjustedDemand)}</strong></div><div className="account-row"><span>العجز</span><strong>{formatSar(data.deficit)}</strong></div></section>
    </>:<>
    <section className="card" id="surplus-routing"><div className="section-title-row"><h2>توجيه الفائض</h2></div>
      {!routing||positive(data.deficit)?<div className="error-banner">يجب الوصول إلى عجز صفر قبل توزيع الفائض.</div>:!positive(routing.availableSurplus)?<div className="muted">لا يوجد فائض متاح للتوزيع حاليًا.</div>:<>
        <section className="statement-kpis"><div><span>الفائض المتاح</span><strong>{formatSar(routing.availableSurplus)}</strong></div><div><span>تم توزيعه كتخطيط</span><strong>{formatSar(routing.totalDraft)}</strong></div><div><span>غير موزع</span><strong>{formatSar(routing.unassignedSurplus)}</strong></div><div><span>تجاوز</span><strong>{formatSar(routing.overAssigned)}</strong></div></section>
        <div className="p44-review-list">{routing.destinations.map(d=><section className="form-card" key={d.key}><div className="section-title-row"><div><strong>{d.label}</strong><div className="muted">{d.reason}</div></div>{d.suggestedCap!==null?<div><small className="muted">حد الاحتياج المعروف</small><strong>{formatSar(d.suggestedCap)}</strong></div>:null}</div><form action={saveSurplusRoutingDraftAction} className="inline-form"><input type="hidden" name="destinationType" value={d.kind}/><input type="hidden" name="goalId" value={d.goalId??''}/><input type="hidden" name="emergencyFundId" value={d.emergencyFundId??''}/><input type="hidden" name="fundingSourceId" value={d.fundingSourceId??''}/><input type="hidden" name="investmentAccountId" value={d.investmentAccountId??''}/><label>المبلغ الذي تريد تخصيصه<input name="amount" inputMode="decimal" defaultValue={positive(d.currentDraft)?d.currentDraft:''} placeholder="مثال: 50"/></label><button className="primary-button" type="submit">حفظ التوزيع</button></form></section>)}</div>
      </>}
    </section>
    <section className="card ux-action-zone"><div className="section-title-row"><h2>المراجعة النهائية</h2><Link href="/budget/optimizer/review" className="primary-link">التالي</Link></div></section>
    </>}
  </section></main>;
}
