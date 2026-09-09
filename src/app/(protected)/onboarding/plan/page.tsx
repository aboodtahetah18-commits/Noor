import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getOnboardingStatus } from '@/features/onboarding/queries/get-onboarding-status';
import { getFinancialPlan } from '@/features/financial-plan/queries/get-financial-plan';
import { createOnboardingPlanAction, approveOnboardingPlanAction, completeOnboardingAction } from '../actions';
import { ManualPlanBuilder } from '@/features/onboarding/components/manual-plan-builder';
import { OnboardingStepNav } from '@/features/onboarding/components/onboarding-step-nav';

const allocationLabels: Record<string,string> = {
  OBLIGATION:'التزام', ESSENTIAL:'أساسي', FLEXIBLE:'مرن', SAVING:'ادخار', EMERGENCY:'طوارئ', GOAL:'هدف',
};

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; approved?: string }> }) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
  const user = await requireAuthenticatedUser();
  const status = await getOnboardingStatus(user.id);
  if (status.completed) redirect('/dashboard');
  const cycleId = status.cycleId;
  if (!cycleId || status.expectedIncomeCount < 1) return redirect('/onboarding/income');
  if (!status.obligationsReviewed) redirect('/onboarding/obligations');
  if (!status.controlsReviewed) redirect('/onboarding/controls');
  const query = await searchParams;
  const plan = status.planId ? await getFinancialPlan(user.id, status.planId) : null;
  const state = !plan ? 'BUILD' : plan.status === 'ACTIVE_PLAN' ? 'DONE' : 'REVIEW';

  return <main className="app-page onboarding-page" dir="rtl"><div className="page-shell plan-builder-shell p47-closure-page">
    <div className="onboarding-progress"><span>6 من 6</span><strong>إنشاء أول خطة مالية</strong></div>
    <OnboardingStepNav current="/onboarding/plan" />
    <header className="page-header p47-closure-header"><div><p className="eyebrow">الخطة المالية الأولى</p><div className="title-with-help"><h1>{state==='BUILD'?'أضف بنود الخطة':state==='REVIEW'?'راجع الخطة قبل اعتمادها':'الخطة جاهزة'}</h1></div></div></header>
    <div className="onboarding-plan-stages" aria-label="حالة الخطة"><span className={state==='BUILD'?'active':''}>1. بناء المسودة</span><span className={state==='REVIEW'?'active':''}>2. المراجعة والاعتماد</span><span className={state==='DONE'?'active':''}>3. إنهاء الإعداد</span></div>
    {query.error && <p className="form-error" role="alert">{query.error}</p>}
    {query.created === '1' && <p className="success-callout" role="status">تم حفظ مسودة الخطة. راجعها ثم اعتمدها.</p>}
    {query.approved === '1' && <p className="success-callout" role="status">تم اعتماد الخطة الأولى بنجاح.</p>}

    {!plan ? <section className="card plan-editor-card">
      <div className="section-heading"><div><h2>بنود خطتك</h2></div></div>
      <ManualPlanBuilder cycleId={cycleId} startCycleDate={status.cycleStartDate ?? today} action={createOnboardingPlanAction}/>
    </section> : plan.status !== 'ACTIVE_PLAN' ? <section className="card plan-editor-card">
      <div className="title-with-help"><h2>مراجعة المسودة</h2></div>
      <p className="onboarding-required-note">الاعتماد يجعل هذه النسخة هي الخطة الأولى المستخدمة في النظام.</p>
      <div className="plan-table-wrap"><table className="plan-table"><thead><tr><th>#</th><th>البند</th><th>المجموعة</th><th>المبلغ</th><th>التكرار</th></tr></thead><tbody>
      {(plan.currentVersion?.allocations ?? plan.pendingRevision?.allocations ?? []).map((allocation,i)=><tr key={allocation.id}><td>{i+1}</td><td><strong>{allocation.categoryName}</strong></td><td>{allocationLabels[allocation.allocationType] ?? 'أخرى'}</td><td dir="ltr">{Number(allocation.plannedAmount).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ريال</td><td>{allocation.recurrenceKind==='EVERY_N_CYCLES'?`كل ${allocation.intervalCycles??2} دورة`:allocation.recurrenceKind==='ONE_TIME'?'مرة واحدة':allocation.recurrenceKind==='SEASONAL'?'موسمي':'كل دورة'}</td></tr>)}
      </tbody></table></div>
      <form className="onboarding-approval-form" action={approveOnboardingPlanAction.bind(null, plan.id)}><button className="primary-button" type="submit">اعتماد الخطة الأولى</button></form>
    </section> : <section className="card onboarding-review-card"><div><h2>الخطة معتمدة</h2><p className="success-callout" role="status">أصبحت الخطة الأولى معتمدة. يمكنك الآن إنهاء الإعداد والانتقال إلى الرئيسية.</p></div><form action={completeOnboardingAction}><button className="primary-button" type="submit">إنهاء الإعداد والذهاب للرئيسية</button></form></section>}
  </div></main>;
}
