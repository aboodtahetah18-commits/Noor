import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getCurrentFinancialCycle } from '@/features/cycles/queries/get-current-cycle';
import { getFinancialPlanByCycle } from '@/features/financial-plan/queries/get-financial-plan';
import { getBudgetCommandCenter } from '@/features/budget/queries/get-budget-command-center';
import { formatSar } from '@/lib/format-money';
import { approvePlanAction, approveRevisionAction } from './actions';
import { FocusedNextStep } from '@/components/ux/focused-next-step';

const labels:Record<string,string>={OBLIGATION:'الالتزامات',ESSENTIAL:'الاحتياجات الأساسية',SAVING:'الادخار',EMERGENCY:'الطوارئ',GOAL:'الأهداف',FLEXIBLE:'المصروف المرن'};
const planStatus:Record<string,string>={PLAN_DRAFT:'مسودة',ACTIVE_PLAN:'معتمدة',REVISED:'تعديل بانتظار الاعتماد',CLOSED_PLAN:'مغلقة'};
function pct(v:number|null){return v==null?'—':`${Math.round(v)}%`}

export default async function BudgetPage(){
  const u=await requireAuthenticatedUser();
  const cycle=await getCurrentFinancialCycle(u.id);
  if(!cycle)return <main className="p47-page" dir="rtl"><section className="p47-content-shell p47-empty-shell"><div className="p47-empty-state"><div className="p47-empty-icon">خ</div><p className="p47-kicker">الميزانية</p><h1>لا توجد دورة مالية نشطة</h1><p>ابدأ دورة مالية حتى تتمكن من توزيع الدخل ومتابعة الصرف مقابل الخطة.</p><Link href="/cycles/new" className="p47-primary-action">بدء دورة مالية</Link></div></section></main>;
  const plan=await getFinancialPlanByCycle(u.id,cycle.id);
  if(!plan)return <main className="p47-page" dir="rtl"><section className="p47-content-shell"><header className="p47-page-heading"><div><p className="p47-kicker">الميزانية · {cycle.name}</p><h1>أنشئ خطة الدورة</h1><p className="p47-cycle-line">لا توجد تخصيصات مالية معتمدة لهذه الدورة بعد.</p></div><Link href={`/budget/new?cycle=${cycle.id}`} className="p47-primary-action">إنشاء الخطة</Link></header><section className="p47-panel"><div className="p47-soft-empty is-info"><strong>ابدأ من توزيع الدخل</strong><span>وزع الدخل على الالتزامات والاحتياجات والادخار والطوارئ والأهداف والمصروف المرن، ثم راجع الخطة قبل اعتمادها.</span></div></section></section></main>;
  const center=await getBudgetCommandCenter(u.id,cycle.id);
  const view=plan.pendingRevision??plan.currentVersion;
  return <main className="p47-page" dir="rtl"><section className="p47-content-shell">
    <header className="p47-page-heading"><div><p className="p47-kicker">خطة الإنفاق الشهرية · {cycle.name}</p><div className="title-with-help"><h1>الميزانية</h1></div><div className="p47-cycle-line"><span className={`p47-status-dot ${center.overBudgetCount?'is-danger':'is-good'}`}/><span>{planStatus[plan.status]??plan.status}</span><b>•</b><span>{center.overBudgetCount?`${center.overBudgetCount} بند متجاوز`:'لا يوجد تجاوز مؤكد'}</span></div></div><div className="p47-page-actions"><Link href="/budget/optimizer" className="p47-secondary-action">تحسين توزيع الراتب</Link>{plan.status==='ACTIVE_PLAN'?<Link href={`/budget/revise?plan=${plan.id}`} className="p47-primary-action">تعديل الخطة</Link>:null}</div></header>

    <section className="p47-budget-hero"><div><p className="p47-kicker">ملخص الخطة</p><span>إجمالي المخصص</span><strong>{formatSar(center.plannedTotal)}</strong><small>المصروف الفعلي {formatSar(center.actualTotal)}</small></div><div className="p47-budget-hero-progress"><div><span style={{width:`${Math.min(100,Math.max(0,center.utilizationPercent??0))}%`}}/></div><div><span>المتبقي</span><strong>{formatSar(center.remainingTotal)}</strong><b>{pct(center.utilizationPercent)} مستخدم</b></div></div></section>

    <section className="p47-budget-summary-grid">{Object.entries(plan.totals).map(([k,v])=><article key={k}><span>{labels[k]??k}</span><strong>{formatSar(String(v))}</strong><small>{center.items.filter(i=>i.allocationType===k).length} بنود</small></article>)}</section>

    {plan.status==='REVISED'?<section className="p47-panel p47-revision-banner"><div><strong>هناك نسخة تعديل بانتظار الاعتماد</strong><p>النسخة السابقة محفوظة ولن تتغير حتى تعتمد النسخة الجديدة.</p></div><form action={approveRevisionAction.bind(null,plan.id)}><button className="p47-primary-action">اعتماد النسخة الجديدة</button></form></section>:null}
    {plan.status==='PLAN_DRAFT'?<section className="p47-panel p47-revision-banner"><div><strong>الخطة ما زالت مسودة</strong><p>راجع التوزيع قبل تفعيلها على الدورة.</p></div><form action={approvePlanAction.bind(null,plan.id)}><button className="p47-primary-action">اعتماد الخطة</button></form></section>:null}

    <section className="p47-panel"><div className="p47-section-heading"><div><p className="p47-kicker">البنود</p><h2>{plan.status==='REVISED'?'نسخة التعديل المقترحة':'المخطط مقابل الفعلي'}</h2></div><Link href="/budget-categories">إدارة البنود</Link></div>
      <div className="p47-budget-list">{center.items.map(item=><article key={item.categoryId} className={item.status==='OVER_BUDGET'?'is-over':''}><div className="p47-budget-item-main"><div><strong>{item.categoryName}</strong><span>{labels[item.allocationType]??item.allocationType}</span></div><em>{item.status==='OVER_BUDGET'?'متجاوز':'ضمن الخطة'}</em></div><div className="p47-budget-item-bar"><span style={{width:`${Math.min(100,Math.max(0,item.utilizationPercent??0))}%`}}/></div><div className="p47-budget-item-values"><span>المخطط <b>{formatSar(item.plannedAmount)}</b></span><span>الفعلي <b>{formatSar(item.actualAmount)}</b></span><span>المتبقي <b>{formatSar(item.remainingAmount)}</b></span><span>الاستخدام <b>{pct(item.utilizationPercent)}</b></span></div></article>)}</div>
      {!center.items.length?<div className="p47-soft-empty"><strong>لا توجد بنود في هذه النسخة.</strong><span>أضف تخصيصات للخطة حتى تظهر متابعة الميزانية.</span></div>:null}
    </section>
    {view&&plan.status==='REVISED'?<section className="p47-panel"><div className="p47-section-heading"><div><p className="p47-kicker">التعديل المقترح</p><h2>قيم النسخة الجديدة</h2></div></div><div className="p47-list">{view.allocations.map(a=><div key={a.id}><div><strong>{a.categoryName}</strong><span>{labels[a.allocationType]??a.allocationType}</span></div><b>{formatSar(a.plannedAmount)}</b></div>)}</div></section>:null}
    <FocusedNextStep href="/obligations" title="التالي: الالتزامات" description="بعد مراجعة الخطة، انتقل إلى الاستحقاقات التي يجب دفعها ومواعيدها."/>
  </section></main>
}
