import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getCurrentFinancialCycle } from '@/features/cycles/queries/get-current-cycle';
import { getFinancialPlanByCycle } from '@/features/financial-plan/queries/get-financial-plan';
import { getBudgetCommandCenter } from '@/features/budget/queries/get-budget-command-center';
import { formatSar } from '@/lib/format-money';
import { approvePlanAction, approveRevisionAction, updateInitialDraftAction, applyInitialBudgetCorrectionsAction } from './actions';
import { FocusedNextStep } from '@/components/ux/focused-next-step';
import { rawSql } from '@/infrastructure/db/client';
import { reviewInitialBudgetDraft } from '@/features/financial-plan/services/review-initial-budget-draft';

const labels:Record<string,string>={OBLIGATION:'الالتزامات',ESSENTIAL:'الاحتياجات الأساسية',SAVING:'الادخار',EMERGENCY:'الطوارئ',GOAL:'الأهداف',FLEXIBLE:'المصروف المرن'};
const planStatus:Record<string,string>={PLAN_DRAFT:'مسودة',ACTIVE_PLAN:'معتمدة',REVISED:'تعديل بانتظار الاعتماد',CLOSED_PLAN:'مغلقة'};
function pct(v:number|null){return v==null?'—':`${Math.round(v)}%`}

export default async function BudgetPage({searchParams}:{searchParams:Promise<{error?:string;draft?:string}>}){
  const q=await searchParams;
  const u=await requireAuthenticatedUser();
  const cycle=await getCurrentFinancialCycle(u.id);
  if(!cycle)return <main className="p47-page" dir="rtl"><section className="p47-content-shell p47-empty-shell"><div className="p47-empty-state"><div className="p47-empty-icon">خ</div><p className="p47-kicker">الميزانية</p><h1>لا توجد دورة مالية نشطة</h1><p>ابدأ دورة مالية حتى تتمكن من توزيع الدخل ومتابعة الصرف مقابل الخطة.</p><Link href="/cycles/new" className="p47-primary-action">بدء دورة مالية</Link></div></section></main>;
  const plan=await getFinancialPlanByCycle(u.id,cycle.id);
  if(!plan)return <main className="p47-page" dir="rtl"><section className="p47-content-shell"><header className="p47-page-heading"><div><p className="p47-kicker">الميزانية · {cycle.name}</p><h1>أنشئ خطة الدورة</h1><p className="p47-cycle-line">لا توجد تخصيصات مالية معتمدة لهذه الدورة بعد.</p></div><Link href={`/budget/new?cycle=${cycle.id}`} className="p47-primary-action">إنشاء الخطة</Link></header><section className="p47-panel"><div className="p47-soft-empty is-info"><strong>ابدأ من توزيع الدخل</strong><span>وزع الدخل على الالتزامات والاحتياجات والادخار والطوارئ والأهداف والمصروف المرن، ثم راجع الخطة قبل اعتمادها.</span></div></section></section></main>;

  if(plan.status==='PLAN_DRAFT'){
    const draftRows=await rawSql`
      select ba.id,bc.name,ba.planned_amount::text,ba.allocation_type,
        r.recurrence_kind,r.interval_cycles,r.note
      from public.plan_versions pv
      join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.user_id=pv.user_id
      join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=ba.user_id
      left join public.plan_item_rules r on r.user_id=ba.user_id and r.category_id=ba.category_id and r.is_active=true
      where pv.user_id=${u.id}::uuid and pv.plan_id=${plan.id}::uuid
        and pv.version_number=1 and pv.approved_at is null
      order by case ba.allocation_type when 'OBLIGATION' then 1 when 'ESSENTIAL' then 2 when 'FLEXIBLE' then 3 else 4 end,bc.name
    `;
    const total=draftRows.reduce((sum,row)=>sum+Number(row.planned_amount??0),0);
    const review=await reviewInitialBudgetDraft(u.id,plan.id);
    const blockers=review.issues.filter(issue=>issue.severity==='blocker');
    const warnings=review.issues.filter(issue=>issue.severity==='warning');
    return <main className="p47-page" dir="rtl"><section className="p47-content-shell">
      <header className="p47-page-heading"><div><p className="p47-kicker">الميزانية · {cycle.name}</p><h1>مسودة الميزانية الأولى</h1><p className="p47-cycle-line">بناها نماء من بيانات التأسيس. راجع المبالغ والتصنيفات قبل الاعتماد.</p></div></header>
      {q.error?<p className="error-banner" role="alert">{q.error}</p>:null}
      {q.draft==='updated'?<p className="success-banner">تم حفظ تعديلات المسودة. لم تعتمد الميزانية بعد.</p>:null}
      {q.draft==='corrected'?<p className="success-banner">تم تطبيق اقتراحات التصحيح على البنود غير الأساسية. راجع الأرقام ثم اعتمد الميزانية إذا أصبحت المراجعة سليمة.</p>:null}

      <section className="p47-budget-hero"><div><p className="p47-kicker">إجمالي المسودة</p><strong>{formatSar(total.toFixed(2))}</strong><small>{draftRows.length} بنود تأسيسية</small></div><div><span>الحالة</span><strong>بانتظار مراجعتك</strong><small>لا توجد حركات مالية ناتجة عن هذه المسودة.</small></div></section>

      <form action={updateInitialDraftAction.bind(null,plan.id)} className="p47-panel namaa-initial-budget-draft">
        <div className="p47-section-heading"><div><p className="p47-kicker">المراجعة</p><h2>عدّل قبل الاعتماد</h2></div><span>{draftRows.length} بنود</span></div>
        <div className="namaa-initial-budget-list">
          {draftRows.map((row,index)=><article key={String(row.id)} className="namaa-initial-budget-item">
            <div className="namaa-initial-budget-item-head"><span>{index+1}</span><div><strong>{String(row.name)}</strong><small>{String(row.note??'بند من بيانات التأسيس')}</small></div></div>
            <input type="hidden" name="allocationId" value={String(row.id)}/>
            <label><span>المبلغ المخطط</span><input name="plannedAmount" type="number" min="0" step="0.01" defaultValue={String(row.planned_amount)} inputMode="decimal" required/></label>
            <label><span>التصنيف</span><select name="allocationType" defaultValue={String(row.allocation_type)}>
              <option value="OBLIGATION">التزام</option>
              <option value="ESSENTIAL">احتياج أساسي</option>
              <option value="FLEXIBLE">مصروف مرن</option>
              <option value="SAVING">ادخار</option>
              <option value="EMERGENCY">طوارئ</option>
              <option value="GOAL">هدف</option>
            </select></label>
          </article>)}
        </div>
        <div className="namaa-initial-budget-actions">
          <button type="submit" className="p47-secondary-action">حفظ التعديلات</button>
        </div>
      </form>

      <section className="p47-panel namaa-budget-smart-review">
        <div className="p47-section-heading"><div><p className="p47-kicker">المراجعة الذكية</p><h2>{review.canApprove?'المسودة قابلة للاعتماد':'يلزم معالجة ملاحظات قبل الاعتماد'}</h2></div><span>{review.issues.length} ملاحظات</span></div>
        <div className="namaa-budget-review-metrics">
          <article><span>الدخل الشهري المرجعي</span><strong>{formatSar(review.income.toFixed(2))}</strong></article>
          <article><span>الالتزامات والأساسيات</span><strong>{formatSar(review.coreTotal.toFixed(2))}</strong><small>المتبقي بعدها {formatSar(review.remainingAfterCore.toFixed(2))}</small></article>
          <article><span>إجمالي المسودة</span><strong>{formatSar(review.total.toFixed(2))}</strong><small>المتبقي بعد الخطة {formatSar(review.remainingAfterPlan.toFixed(2))}</small></article>
        </div>
        {blockers.length?<div className="namaa-budget-review-issues is-blocking">{blockers.map(issue=><article key={issue.code+(issue.itemName??'')}><strong>يلزم التصحيح</strong><p>{issue.message}</p></article>)}</div>:null}
        {warnings.length?<div className="namaa-budget-review-issues is-warning">{warnings.map(issue=><article key={issue.code+(issue.itemName??'')}><strong>تنبيه للمراجعة</strong><p>{issue.message}</p></article>)}</div>:null}

        {review.correctionSuggestions.length?<section className="namaa-budget-correction-plan" aria-label="اقتراحات التصحيح">
          <div className="namaa-budget-correction-head">
            <div><strong>اقتراحات تصحيح تلقائية</strong><small>يبدأ نماء بالبنود المرنة، ثم الأهداف، ثم الادخار. لا يقترح تخفيض الالتزامات أو الاحتياجات الأساسية تلقائيًا.</small></div>
            <span>خفض مقترح {formatSar(review.suggestedReductionTotal.toFixed(2))}</span>
          </div>
          <div className="namaa-budget-correction-list">
            {review.correctionSuggestions.map(suggestion=><article key={suggestion.allocationId}>
              <div><strong>{suggestion.itemName}</strong><small>{suggestion.reason}</small></div>
              <div className="namaa-budget-correction-values">
                <span>الحالي <b>{formatSar(suggestion.currentAmount.toFixed(2))}</b></span>
                <span>المقترح <b>{formatSar(suggestion.suggestedAmount.toFixed(2))}</b></span>
                <span>التخفيض <b>{formatSar(suggestion.reduction.toFixed(2))}</b></span>
              </div>
            </article>)}
          </div>
          {review.unresolvedGap>0?<div className="namaa-budget-correction-residual"><strong>تبقى فجوة لا يمكن حلها من البنود غير الأساسية:</strong><span>{formatSar(review.unresolvedGap.toFixed(2))}</span><p>راجع تصنيف أو قيمة أحد الالتزامات/الاحتياجات الأساسية أو صحح الدخل المؤكد. لن يخفض نماء هذه البنود تلقائيًا.</p></div>:null}
          <form action={applyInitialBudgetCorrectionsAction.bind(null,plan.id)}>
            <button className="p47-secondary-action">تطبيق الاقتراحات على المسودة</button>
          </form>
        </section>:null}

        {!review.issues.length?<div className="p47-soft-empty is-info"><strong>لم تُكتشف ملاحظات حرجة.</strong><span>يمكنك اعتماد المسودة بعد التأكد النهائي من البنود.</span></div>:null}
      </section>

      <section className="p47-panel p47-revision-banner"><div><strong>{review.canApprove?'جاهز للاعتماد؟':'الاعتماد متوقف مؤقتًا'}</strong><p>{review.canApprove?'اعتماد المسودة يجعلها الخطة النشطة للدورة. لن يتم تنفيذ أي دفع تلقائيًا.':'عالج الملاحظات الحرجة أعلاه ثم احفظ التعديلات. سيعيد نماء المراجعة تلقائيًا قبل السماح بالاعتماد.'}</p></div><form action={approvePlanAction.bind(null,plan.id)}><button className="p47-primary-action" disabled={!review.canApprove} aria-disabled={!review.canApprove}>{review.canApprove?'اعتماد الميزانية':'عالج الملاحظات أولًا'}</button></form></section>
    </section></main>;
  }

  const center=await getBudgetCommandCenter(u.id,cycle.id);
  const view=plan.pendingRevision??plan.currentVersion;
  return <main className="p47-page" dir="rtl"><section className="p47-content-shell">
    <header className="p47-page-heading"><div><p className="p47-kicker">خطة الإنفاق الشهرية · {cycle.name}</p><div className="title-with-help"><h1>الميزانية</h1></div><div className="p47-cycle-line"><span className={`p47-status-dot ${center.overBudgetCount?'is-danger':'is-good'}`}/><span>{planStatus[plan.status]??plan.status}</span><b>•</b><span>{center.overBudgetCount?`${center.overBudgetCount} بند متجاوز`:'لا يوجد تجاوز مؤكد'}</span></div></div><div className="p47-page-actions"><Link href="/budget/optimizer" className="p47-secondary-action">تحسين توزيع الراتب</Link>{plan.status==='ACTIVE_PLAN'?<Link href={`/budget/revise?plan=${plan.id}`} className="p47-primary-action">تعديل الخطة</Link>:null}</div></header>

    <section className="p47-budget-hero"><div><p className="p47-kicker">ملخص الخطة</p><span>إجمالي المخصص</span><strong>{formatSar(center.plannedTotal)}</strong><small>المصروف الفعلي {formatSar(center.actualTotal)}</small></div><div className="p47-budget-hero-progress"><div><span style={{width:`${Math.min(100,Math.max(0,center.utilizationPercent??0))}%`}}/></div><div><span>المتبقي</span><strong>{formatSar(center.remainingTotal)}</strong><b>{pct(center.utilizationPercent)} مستخدم</b></div></div></section>

    <section className="p47-budget-summary-grid">{Object.entries(plan.totals).map(([k,v])=><article key={k}><span>{labels[k]??k}</span><strong>{formatSar(String(v))}</strong><small>{center.items.filter(i=>i.allocationType===k).length} بنود</small></article>)}</section>

    {plan.status==='REVISED'?<section className="p47-panel p47-revision-banner"><div><strong>هناك نسخة تعديل بانتظار الاعتماد</strong><p>النسخة السابقة محفوظة ولن تتغير حتى تعتمد النسخة الجديدة.</p></div><form action={approveRevisionAction.bind(null,plan.id)}><button className="p47-primary-action">اعتماد النسخة الجديدة</button></form></section>:null}

    <section className="p47-panel"><div className="p47-section-heading"><div><p className="p47-kicker">البنود</p><h2>{plan.status==='REVISED'?'نسخة التعديل المقترحة':'المخطط مقابل الفعلي'}</h2></div><Link href="/budget-categories">إدارة البنود</Link></div>
      <div className="p47-budget-list">{center.items.map(item=><article key={item.categoryId} className={item.status==='OVER_BUDGET'?'is-over':''}><div className="p47-budget-item-main"><div><strong>{item.categoryName}</strong><span>{labels[item.allocationType]??item.allocationType}</span></div><em>{item.status==='OVER_BUDGET'?'متجاوز':'ضمن الخطة'}</em></div><div className="p47-budget-item-bar"><span style={{width:`${Math.min(100,Math.max(0,item.utilizationPercent??0))}%`}}/></div><div className="p47-budget-item-values"><span>المخطط <b>{formatSar(item.plannedAmount)}</b></span><span>الفعلي <b>{formatSar(item.actualAmount)}</b></span><span>المتبقي <b>{formatSar(item.remainingAmount)}</b></span><span>الاستخدام <b>{pct(item.utilizationPercent)}</b></span></div></article>)}</div>
      {!center.items.length?<div className="p47-soft-empty"><strong>لا توجد بنود في هذه النسخة.</strong><span>أضف تخصيصات للخطة حتى تظهر متابعة الميزانية.</span></div>:null}
    </section>
    {view&&plan.status==='REVISED'?<section className="p47-panel"><div className="p47-section-heading"><div><p className="p47-kicker">التعديل المقترح</p><h2>قيم النسخة الجديدة</h2></div></div><div className="p47-list">{view.allocations.map(a=><div key={a.id}><div><strong>{a.categoryName}</strong><span>{labels[a.allocationType]??a.allocationType}</span></div><b>{formatSar(a.plannedAmount)}</b></div>)}</div></section>:null}
    <FocusedNextStep href="/obligations" title="التالي: الالتزامات" description="بعد مراجعة الخطة، انتقل إلى الاستحقاقات التي يجب دفعها ومواعيدها."/>
  </section></main>
}
