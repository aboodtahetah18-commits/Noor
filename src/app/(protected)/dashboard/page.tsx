import type { CSSProperties } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getDashboardSummary } from '@/features/dashboard/queries/get-dashboard-summary';
import { formatSar } from '@/lib/format-money';
import { viewRecommendationAction } from '@/app/(protected)/advisor/actions';
import { getOnboardingStatus } from '@/features/onboarding/queries/get-onboarding-status';
import { getDailyCommandCenter } from '@/features/dashboard/queries/get-daily-command-center';
import { CYCLE_STATUS_LABELS, OBLIGATION_STATUS_LABELS, financialStatusLabel } from '@/lib/financial-status-labels';
import { BankMessageDialogTrigger } from '@/components/bank-message-dialog';
import { LucideIcon } from '@/components/ui/lucide-icon';

function metricValue(value: string | null, blockedLabel = 'غير متاح بعد') {
  return value === null ? blockedLabel : formatSar(value);
}

function pct(value: string | null) {
  return value === null ? '—' : `${Number(value).toLocaleString('ar-SA-u-nu-latn', { maximumFractionDigits: 1 })}٪`;
}

function StatusDot({ tone = 'neutral' }: { tone?: 'good' | 'warn' | 'danger' | 'neutral' }) {
  return <span className={`p47-status-dot is-${tone}`} aria-hidden="true" />;
}

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();
  const onboarding = await getOnboardingStatus(user.id);
  if (!onboarding.completed) redirect('/onboarding');
  const dashboard = await getDashboardSummary(user.id);

  if (!dashboard) {
    return (
      <main className="p47-page p47-dashboard-page" dir="rtl">
        <div className="p47-content-shell p47-empty-shell">
          <section className="p47-empty-state">
            <div className="p47-empty-icon" aria-hidden="true"><LucideIcon name="walletCards" size={24}/></div>
            <p className="p47-kicker">مستقبلي</p>
            <h1>ابدأ دورتك المالية الأولى</h1>
            <p>أنشئ دورة مالية حتى يبدأ النظام في حساب وضعك المالي الحقيقي وعرض الإجراء التالي المناسب.</p>
            <Link className="p47-primary-action" href="/cycles/new">بدء دورة مالية</Link>
          </section>
        </div>
      </main>
    );
  }

  const budgetUtilization = Math.min(100, Math.max(0, Number(dashboard.budget.utilizationPercent ?? '0')));
  const commandCenter = dashboard.cycle.source === 'LIVE' ? await getDailyCommandCenter(user.id, dashboard.cycle.id) : null;
  const overdueCount = dashboard.upcomingObligations.filter((x) => x.status === 'OVERDUE').length;
  const primaryAction = overdueCount > 0
    ? { title: 'يوجد التزام متأخر', detail: `${overdueCount} التزام يحتاج معالجة قبل القرارات الاختيارية.`, href: '/obligations' }
    : commandCenter?.actions[0] ?? null;
  const hasPressure = overdueCount > 0 || Boolean(commandCenter && (commandCenter.bankPending + commandCenter.unexplainedDeviations + commandCenter.goalGaps + commandCenter.fundingRecoveries) > 0);

  return (
    <main className="p47-page p47-dashboard-page" dir="rtl">
      <div className="p47-content-shell">
        <header className="p47-page-heading">
          <div>
            <p className="p47-kicker">ملخص مالي سريع</p>
            <h1>لوحة التحكم</h1>
            <div className="p47-cycle-line"><StatusDot tone={dashboard.cycle.status === 'ACTIVE' ? 'good' : 'neutral'} /><span>{dashboard.cycle.name}</span><b>·</b><span>{financialStatusLabel(CYCLE_STATUS_LABELS, dashboard.cycle.status)}</span><b>·</b><span>{dashboard.cycle.remainingDays} يوم حتى الدخل القادم</span></div>
          </div>
          <div className="p47-page-actions p72-dashboard-actions">
            <Link className="p47-primary-action" href="/expenses">+ إضافة مصروف</Link>
            <BankMessageDialogTrigger className="p47-secondary-action">رسالة بنك</BankMessageDialogTrigger>
          </div>
        </header>

        {overdueCount > 0 ? <section className="p72-critical-strip" role="alert" aria-label="تنبيه مالي مهم"><div><strong>لديك {overdueCount} التزام متأخر</strong><span>معالجته تأتي قبل القرارات المالية الاختيارية لهذه الدورة.</span></div><Link href="/obligations">مراجعة الالتزامات</Link></section> : null}

        <section className="p47-financial-hero p72-financial-hero" aria-labelledby="safe-title">
          <div className="p47-hero-main">
            <div className="p47-hero-label"><span>المتاح الآمن للصرف</span><em>ما يمكنك استخدامه دون التأثير على المحجوزات الحالية</em></div>
            <h2 id="safe-title">{metricValue(dashboard.safeToSpend.amount)}</h2>
            <p>{dashboard.safeToSpend.status === 'BLOCKED' ? 'لن يعرض النظام رقمًا تقديريًا غير معتمد قبل اكتمال قاعدة الأمان المالي.' : `حتى الدخل القادم · الحد اليومي الآمن ${metricValue(dashboard.dailySafeLimit.amount)}`}</p>
            <div className="p47-hero-actions"><Link className="p47-primary-action" href="/expenses">إضافة مصروف</Link><BankMessageDialogTrigger className="p47-secondary-action">رسالة بنك</BankMessageDialogTrigger><Link href="/budget">مراجعة الميزانية</Link></div>
          </div>
          <div className="p47-hero-context">
            <div><span>إجمالي السيولة</span><strong>{formatSar(dashboard.liquidity.total)}</strong><small>رصيد فعلي، وليس المبلغ الآمن للصرف</small></div>
            <div><span>حالة اليوم</span><strong className={hasPressure ? 'is-attention' : 'is-stable'}>{hasPressure ? 'تحتاج انتباهك' : 'مستقرة'}</strong><small>{hasPressure ? 'يوجد عنصر واحد على الأقل يحتاج قرارًا.' : 'لا يوجد إجراء عاجل الآن.'}</small></div>
          </div>
        </section>

        <section className="p47-command-panel" aria-labelledby="command-title">
          <div className="p47-section-heading">
            <div><p className="p47-kicker">الإجراء التالي</p><h2 id="command-title">ما الذي يحتاج تدخلك الآن؟</h2>{/* compatibility marker: ما الذي يحتاج قرارك الآن؟ */}</div>
            <Link href="/workspace">كل الإجراءات</Link>
          </div>
          {primaryAction ? (
            <div className="p47-command-action">
              <div className="p47-command-icon">!</div>
              <div><strong>{primaryAction.title}</strong><p>{primaryAction.detail}</p></div>
              <Link className="p47-primary-action" href={primaryAction.href}>معالجة الآن</Link>
            </div>
          ) : (
            <div className="p47-command-clear"><StatusDot tone="good" /><div><strong>لا يوجد إجراء عاجل الآن</strong><span>يمكنك متابعة الصرف وفق خطتك الحالية.</span></div></div>
          )}
          {commandCenter ? <div className="p47-command-metrics">
            <Link href="/bank-operations"><span>قرارات بنكية</span><strong>{commandCenter.bankPending}</strong></Link>
            <Link href="/reports/learning"><span>انحرافات غير مفسرة</span><strong>{commandCenter.unexplainedDeviations}</strong></Link>
            <Link href="/goals"><span>أهداف بها فجوة</span><strong>{commandCenter.goalGaps}</strong></Link>
            <Link href="/internal-funding"><span>استردادات داخلية</span><strong>{commandCenter.fundingRecoveries}</strong></Link>
          </div> : null}
        </section>

        <section className="p47-kpi-strip" aria-label="المؤشرات الرئيسية">
          <article><div className="p47-metric-icon">دخل</div><span>الدخل الفعلي</span><strong>{formatSar(dashboard.income.actual)}</strong><small>المتوقع {formatSar(dashboard.income.expected)}</small></article>
          <article><div className="p47-metric-icon">صرف</div><span>المصروف الفعلي</span><strong>{formatSar(dashboard.budget.actual)}</strong><small>المخطط {formatSar(dashboard.budget.planned)}</small></article>
          <article><div className="p47-metric-icon">باقي</div><span>المتبقي من الميزانية</span><strong>{formatSar(dashboard.budget.remaining)}</strong><small>{dashboard.budget.utilizationPercent ? `${pct(dashboard.budget.utilizationPercent)} مستخدم` : 'لا توجد ميزانية معتمدة'}</small></article>
          <article><div className="p47-metric-icon">ادخار</div><span>الادخار الفعلي</span><strong>{formatSar(dashboard.saving.actual)}</strong><small>معدل الادخار {pct(dashboard.saving.rate)}</small></article>
        </section>

        <section className="p47-dashboard-grid p72-dashboard-insights">
          <article className="p47-panel p47-advisor-panel">
            <div className="p47-section-heading"><div><p className="p47-kicker">المستشار</p><h2>أهم ملاحظة لك</h2></div><Link href="/advisor">كل التوصيات</Link></div>
            {dashboard.topRecommendation ? <div className="p47-advisor-message"><span className="p47-advisor-badge">توصية</span><strong>{dashboard.topRecommendation.title}</strong><p>{dashboard.topRecommendation.message}</p><form action={viewRecommendationAction}><input type="hidden" name="recommendationId" value={dashboard.topRecommendation.id}/><button className="p47-secondary-action" type="submit">عرض السبب والتفاصيل</button></form></div> : <div className="p47-soft-empty"><StatusDot tone="good" /><strong>لا توجد توصية مفتوحة الآن</strong><span>سيظهر هنا ما يستحق انتباهك عندما يتحقق سبب مالي معتمد.</span></div>}
          </article>

          <article className="p47-panel p47-forecast-panel">
            <div className="p47-section-heading"><div><p className="p47-kicker">نهاية الدورة</p><h2>التوقع المالي</h2></div><Link href="/reports/future-pressure">الضغط القادم</Link></div>
            {dashboard.forecast.deficitStatus === 'BUFFER_POLICY_REQUIRED' ? <div className="p47-soft-empty is-info"><strong>قاعدة الاحتياطي مطلوبة</strong><span>اعتمد قاعدة الاحتياطي المالي من الإعدادات حتى يظهر التوقع الرسمي والمبلغ الآمن.</span></div> : <div className="p47-forecast-values"><div><span>الرصيد المتوقع</span><strong>{metricValue(dashboard.forecast.projectedEndBalance)}</strong></div><div><span>العجز المتوقع</span><strong>{metricValue(dashboard.forecast.expectedDeficit)}</strong></div></div>}
          </article>

          <article className="p47-panel p47-obligations-panel">
            <div className="p47-section-heading"><div><p className="p47-kicker">الالتزامات</p><h2>ما القادم؟</h2></div><Link href="/obligations">عرض الكل</Link></div>
            {dashboard.upcomingObligations.length === 0 ? <div className="p47-soft-empty"><StatusDot tone="good" /><strong>لا توجد استحقاقات قريبة</strong><span>لا يوجد التزام مستحق أو متأخر في القائمة الحالية.</span></div> : <div className="p47-list">{dashboard.upcomingObligations.slice(0,4).map((item) => <div key={item.id}><div><strong>{item.name}</strong><span>{item.dueDate} · {financialStatusLabel(OBLIGATION_STATUS_LABELS, item.status)}</span></div><b>{formatSar(item.amount)}</b></div>)}</div>}
          </article>

          <article className="p47-panel p47-budget-panel">
            <div className="p47-section-heading"><div><p className="p47-kicker">الميزانية</p><h2>هل تسير الدورة كما خُطط لها؟</h2></div><Link href="/budget">تفاصيل الميزانية</Link></div>
            <div className="p47-budget-visual"><div className="p47-budget-ring" style={{ '--progress': `${budgetUtilization * 3.6}deg` } as CSSProperties}><span>{pct(dashboard.budget.utilizationPercent)}</span><small>مستخدم</small></div><div className="p47-budget-numbers"><div><span>المخطط</span><strong>{formatSar(dashboard.budget.planned)}</strong></div><div><span>الفعلي</span><strong>{formatSar(dashboard.budget.actual)}</strong></div><div><span>المتبقي</span><strong>{formatSar(dashboard.budget.remaining)}</strong></div></div></div>
          </article>
        </section>

        <section className="p47-progress-row">
          <Link href="/savings"><span>الادخار</span><strong>{formatSar(dashboard.saving.actual)}</strong><small>من مخطط {formatSar(dashboard.saving.planned)}</small></Link>
          <Link href="/emergency"><span>صندوق الطوارئ</span><strong>{dashboard.emergencySummary ? formatSar(dashboard.emergencySummary.currentBalance) : 'غير معد'}</strong><small>{dashboard.emergencySummary?.targetAmount ? `الهدف ${formatSar(dashboard.emergencySummary.targetAmount)}` : 'حدد هدف الصندوق عند الحاجة'}</small></Link>
          <Link href="/goals"><span>الأهداف</span><strong>{dashboard.goalSummaries.length.toLocaleString('ar-SA-u-nu-latn')} هدف</strong><small>{dashboard.goalSummaries[0] ? `${dashboard.goalSummaries[0].name} · ${pct(dashboard.goalSummaries[0].progressPercent)}` : 'لا توجد أهداف حالية'}</small></Link>
        </section>

        <section className="p47-panel p47-modules-panel">
          <div className="p47-section-heading"><div><p className="p47-kicker">عند الحاجة</p><h2>أدوات إضافية</h2></div><Link href="/workspace">مركز النظام</Link></div>
          <div className="p47-module-grid">
            <Link href="/bank-operations"><span>01</span><strong>العمليات البنكية</strong><small>الرسائل والكشوف والمراجعة</small></Link>
            <Link href="/budget/optimizer"><span>02</span><strong>تحسين الخطة</strong><small>العجز والفائض قبل الاعتماد</small></Link>
            <Link href="/internal-funding"><span>03</span><strong>التمويل الداخلي</strong><small>الطوارئ والاستثمار والاسترداد</small></Link>
            <Link href="/reports/future-pressure"><span>04</span><strong>الضغط المالي القادم</strong><small>الدورات والرحلات والسيناريوهات</small></Link>
            <Link href="/reports/learning"><span>05</span><strong>تعلّم النظام</strong><small>سلوكك ودقة القرارات</small></Link>
            <Link href="/decision-log"><span>06</span><strong>سجل القرارات</strong><small>ما تغير ولماذا وما أثره</small></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
