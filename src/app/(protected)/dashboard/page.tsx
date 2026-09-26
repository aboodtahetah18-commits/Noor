import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getDashboardSummary } from '@/features/dashboard/queries/get-dashboard-summary';
import { getDailyCommandCenter } from '@/features/dashboard/queries/get-daily-command-center';
import { formatSar } from '@/lib/format-money';
import { viewRecommendationAction } from '@/app/(protected)/advisor/actions';
import { CYCLE_STATUS_LABELS, OBLIGATION_STATUS_LABELS, financialStatusLabel } from '@/lib/financial-status-labels';
import { BankMessageDialogTrigger } from '@/components/bank-message-dialog';
import { Card, StatusBadge, FeedbackState, Button, ActionIcon } from '@/components/ui';
import { LucideIcon } from '@/components/ui/lucide-icon';
import styles from './dashboard.module.css';

function metricValue(value: string | null, blockedLabel = 'غير متاح بعد') {
  return value === null ? blockedLabel : formatSar(value);
}

function pct(value: string | null) {
  return value === null
    ? '—'
    : `${Number(value).toLocaleString('ar-SA-u-nu-latn', { maximumFractionDigits: 1 })}٪`;
}

function cycleTone(status: string): 'success' | 'neutral' {
  return status === 'ACTIVE' ? 'success' : 'neutral';
}

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();
  const dashboard = await getDashboardSummary(user.id);

  if (!dashboard) {
    return (
      <main className={styles.page} dir="rtl">
        <div className={styles.container}>
          <section className={styles.emptyState} aria-labelledby="dashboard-empty-title">
            <div className={styles.emptyIcon} aria-hidden="true">
              <LucideIcon name="walletCards" size={24} />
            </div>
            <p className={styles.eyebrow}>مستقبلي</p>
            <h1 id="dashboard-empty-title">ابدأ دورتك المالية الأولى</h1>
            <p>أنشئ دورة مالية حتى يبدأ النظام في حساب وضعك المالي الحقيقي وعرض الإجراء التالي المناسب.</p>
            <Link className={styles.primaryLink} href="/cycles/new">بدء دورة مالية</Link>
          </section>
        </div>
      </main>
    );
  }

  const budgetUtilization = Math.min(100, Math.max(0, Number(dashboard.budget.utilizationPercent ?? '0')));
  const commandCenter = dashboard.cycle.source === 'LIVE'
    ? await getDailyCommandCenter(user.id, dashboard.cycle.id)
    : null;

  const overdueCount = dashboard.upcomingObligations.filter((item) => item.status === 'OVERDUE').length;
  const primaryAction = overdueCount > 0
    ? {
        title: 'يوجد التزام متأخر',
        detail: `${overdueCount} التزام يحتاج معالجة قبل القرارات الاختيارية.`,
        href: '/obligations',
      }
    : commandCenter?.actions[0] ?? null;

  const hasPressure = overdueCount > 0 || Boolean(
    commandCenter &&
    (
      commandCenter.bankPending +
      commandCenter.unexplainedDeviations +
      commandCenter.goalGaps +
      commandCenter.fundingRecoveries
    ) > 0
  );

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>ملخص مالي سريع</p>
            <h1>لوحة التحكم</h1>
            <div className={styles.cycleMeta}>
              <StatusBadge tone={cycleTone(dashboard.cycle.status)}>
                {financialStatusLabel(CYCLE_STATUS_LABELS, dashboard.cycle.status)}
              </StatusBadge>
              <span>{dashboard.cycle.name}</span>
              <span aria-hidden="true">·</span>
              <span>{dashboard.cycle.remainingDays} يوم حتى الدخل القادم</span>
            </div>
          </div>

          <div className={styles.headerActions} aria-label="إجراءات سريعة">
            <Link className={styles.primaryLink} href="/expenses">
              <ActionIcon name="add" />
              <span>إضافة مصروف</span>
            </Link>
            <BankMessageDialogTrigger className={styles.secondaryButton}>
              <ActionIcon name="bankMessage" />
              <span>رسالة بنك</span>
            </BankMessageDialogTrigger>
          </div>
        </header>

        {overdueCount > 0 ? (
          <FeedbackState
            tone="error"
            title={`لديك ${overdueCount} التزام متأخر`}
            action={<Link className={styles.textAction} href="/obligations">مراجعة الالتزامات</Link>}
          >
            معالجته تأتي قبل القرارات المالية الاختيارية لهذه الدورة.
          </FeedbackState>
        ) : null}

        <section className={styles.heroGrid} aria-labelledby="safe-title">
          <Card className={styles.heroCard}>
            <div className={styles.heroMain}>
              <div>
                <p className={styles.eyebrow}>المتاح الآمن للصرف</p>
                <h2 id="safe-title">{metricValue(dashboard.safeToSpend.amount)}</h2>
                <p className={styles.heroDescription}>
                  {dashboard.safeToSpend.status === 'BLOCKED'
                    ? 'لن يعرض النظام رقمًا تقديريًا غير معتمد قبل اكتمال قاعدة الأمان المالي.'
                    : `حتى الدخل القادم · الحد اليومي الآمن ${metricValue(dashboard.dailySafeLimit.amount)}`}
                </p>
              </div>
              <div className={styles.heroQuickActions}>
                <Link href="/expenses" className={styles.quickAction}>
                  <ActionIcon name="add" />
                  <span>إضافة مصروف</span>
                </Link>
                <BankMessageDialogTrigger className={styles.quickActionButton}>
                  <ActionIcon name="bankMessage" />
                  <span>رسالة بنك</span>
                </BankMessageDialogTrigger>
                <Link href="/budget" className={styles.quickAction}>
                  <ActionIcon name="view" />
                  <span>مراجعة الميزانية</span>
                </Link>
              </div>
            </div>
          </Card>

          <div className={styles.heroSide}>
            <Card className={styles.summaryCard}>
              <span>إجمالي السيولة</span>
              <strong>{formatSar(dashboard.liquidity.total)}</strong>
              <small>رصيد فعلي، وليس المبلغ الآمن للصرف</small>
            </Card>
            <Card className={styles.summaryCard}>
              <span>حالة اليوم</span>
              <strong>{hasPressure ? 'تحتاج انتباهك' : 'مستقرة'}</strong>
              <StatusBadge tone={hasPressure ? 'warning' : 'success'}>
                {hasPressure ? 'مراجعة مطلوبة' : 'لا يوجد إجراء عاجل'}
              </StatusBadge>
            </Card>
          </div>
        </section>

        <section className={styles.kpiSection} aria-labelledby="kpi-title">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>الوضع المالي</p>
              <h2 id="kpi-title">المؤشرات الرئيسية</h2>
            </div>
          </div>
          <div className={styles.kpiGrid}>
            <Card className={styles.kpiCard}>
              <span>الدخل الفعلي</span>
              <strong>{formatSar(dashboard.income.actual)}</strong>
              <small>المتوقع {formatSar(dashboard.income.expected)}</small>
            </Card>
            <Card className={styles.kpiCard}>
              <span>المصروف الفعلي</span>
              <strong>{formatSar(dashboard.budget.actual)}</strong>
              <small>المخطط {formatSar(dashboard.budget.planned)}</small>
            </Card>
            <Card className={styles.kpiCard}>
              <span>المتبقي من الميزانية</span>
              <strong>{formatSar(dashboard.budget.remaining)}</strong>
              <small>{dashboard.budget.utilizationPercent ? `${pct(dashboard.budget.utilizationPercent)} مستخدم` : 'لا توجد ميزانية معتمدة'}</small>
            </Card>
            <Card className={styles.kpiCard}>
              <span>الادخار الفعلي</span>
              <strong>{formatSar(dashboard.saving.actual)}</strong>
              <small>معدل الادخار {pct(dashboard.saving.rate)}</small>
            </Card>
          </div>
        </section>

        <section className={styles.mainGrid}>
          <Card className={styles.attentionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>الإجراء التالي</p>
                <h2>ما الذي يحتاج تدخلك الآن؟</h2>
              </div>
              <Link className={styles.textAction} href="/workspace">كل الإجراءات</Link>
            </div>

            {primaryAction ? (
              <div className={styles.primaryAttention}>
                <div className={styles.attentionIcon} aria-hidden="true">
                  <LucideIcon name="listChecks" size={24} />
                </div>
                <div>
                  <strong>{primaryAction.title}</strong>
                  <p>{primaryAction.detail}</p>
                </div>
                <Link className={styles.primaryLink} href={primaryAction.href}>معالجة الآن</Link>
              </div>
            ) : (
              <FeedbackState tone="success" title="لا يوجد إجراء عاجل الآن">
                يمكنك متابعة الصرف وفق خطتك الحالية.
              </FeedbackState>
            )}

            {commandCenter ? (
              <div className={styles.commandMetrics} aria-label="مؤشرات تحتاج متابعة">
                <Link href="/bank-operations"><span>قرارات بنكية</span><strong>{commandCenter.bankPending}</strong></Link>
                <Link href="/reports/learning"><span>انحرافات غير مفسرة</span><strong>{commandCenter.unexplainedDeviations}</strong></Link>
                <Link href="/goals"><span>أهداف بها فجوة</span><strong>{commandCenter.goalGaps}</strong></Link>
                <Link href="/internal-funding"><span>استردادات داخلية</span><strong>{commandCenter.fundingRecoveries}</strong></Link>
              </div>
            ) : null}
          </Card>

          <Card className={styles.budgetCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>الميزانية</p>
                <h2>مسار الدورة</h2>
              </div>
              <Link className={styles.textAction} href="/budget">التفاصيل</Link>
            </div>
            <div className={styles.budgetValue}>
              <strong>{pct(dashboard.budget.utilizationPercent)}</strong>
              <span>من الميزانية مستخدم</span>
            </div>
            <progress className={styles.progress} max={100} value={budgetUtilization} aria-label="نسبة استخدام الميزانية" />
            <dl className={styles.definitionGrid}>
              <div><dt>المخطط</dt><dd>{formatSar(dashboard.budget.planned)}</dd></div>
              <div><dt>الفعلي</dt><dd>{formatSar(dashboard.budget.actual)}</dd></div>
              <div><dt>المتبقي</dt><dd>{formatSar(dashboard.budget.remaining)}</dd></div>
            </dl>
          </Card>

          <Card className={styles.advisorCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>المستشار</p>
                <h2>أهم ملاحظة لك</h2>
              </div>
              <Link className={styles.textAction} href="/advisor">كل التوصيات</Link>
            </div>

            {dashboard.topRecommendation ? (
              <div className={styles.recommendation}>
                <StatusBadge tone="info">توصية</StatusBadge>
                <strong>{dashboard.topRecommendation.title}</strong>
                <p>{dashboard.topRecommendation.message}</p>
                <form action={viewRecommendationAction}>
                  <input type="hidden" name="recommendationId" value={dashboard.topRecommendation.id} />
                  <Button variant="secondary" type="submit">عرض السبب والتفاصيل</Button>
                </form>
              </div>
            ) : (
              <FeedbackState tone="success" title="لا توجد توصية مفتوحة الآن">
                سيظهر هنا ما يستحق انتباهك عندما يتحقق سبب مالي معتمد.
              </FeedbackState>
            )}
          </Card>

          <Card className={styles.forecastCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>نهاية الدورة</p>
                <h2>التوقع المالي</h2>
              </div>
              <Link className={styles.textAction} href="/reports/future-pressure">الضغط القادم</Link>
            </div>

            {dashboard.forecast.deficitStatus === 'BUFFER_POLICY_REQUIRED' ? (
              <FeedbackState tone="info" title="قاعدة الاحتياطي مطلوبة">
                اعتمد قاعدة الاحتياطي المالي من الإعدادات حتى يظهر التوقع الرسمي والمبلغ الآمن.
              </FeedbackState>
            ) : (
              <dl className={styles.forecastValues}>
                <div><dt>الرصيد المتوقع</dt><dd>{metricValue(dashboard.forecast.projectedEndBalance)}</dd></div>
                <div><dt>العجز المتوقع</dt><dd>{metricValue(dashboard.forecast.expectedDeficit)}</dd></div>
              </dl>
            )}
          </Card>

          <Card className={styles.obligationsCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>الالتزامات</p>
                <h2>ما القادم؟</h2>
              </div>
              <Link className={styles.textAction} href="/obligations">عرض الكل</Link>
            </div>

            {dashboard.upcomingObligations.length === 0 ? (
              <FeedbackState tone="success" title="لا توجد استحقاقات قريبة">
                لا يوجد التزام مستحق أو متأخر في القائمة الحالية.
              </FeedbackState>
            ) : (
              <div className={styles.obligationList}>
                {dashboard.upcomingObligations.slice(0, 4).map((item) => (
                  <div key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.dueDate}</span>
                    </div>
                    <div className={styles.obligationValue}>
                      <b>{formatSar(item.amount)}</b>
                      <StatusBadge tone={item.status === 'OVERDUE' ? 'error' : 'neutral'}>
                        {financialStatusLabel(OBLIGATION_STATUS_LABELS, item.status)}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section className={styles.progressSection} aria-labelledby="progress-title">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>التقدم</p>
              <h2 id="progress-title">الادخار والحماية والأهداف</h2>
            </div>
          </div>
          <div className={styles.progressGrid}>
            <Link href="/savings">
              <span>الادخار</span>
              <strong>{formatSar(dashboard.saving.actual)}</strong>
              <small>من مخطط {formatSar(dashboard.saving.planned)}</small>
            </Link>
            <Link href="/emergency">
              <span>صندوق الطوارئ</span>
              <strong>{dashboard.emergencySummary ? formatSar(dashboard.emergencySummary.currentBalance) : 'غير معد'}</strong>
              <small>{dashboard.emergencySummary?.targetAmount ? `الهدف ${formatSar(dashboard.emergencySummary.targetAmount)}` : 'حدد هدف الصندوق عند الحاجة'}</small>
            </Link>
            <Link href="/goals">
              <span>الأهداف</span>
              <strong>{dashboard.goalSummaries.length.toLocaleString('ar-SA-u-nu-latn')} هدف</strong>
              <small>{dashboard.goalSummaries[0] ? `${dashboard.goalSummaries[0].name} · ${pct(dashboard.goalSummaries[0].progressPercent)}` : 'لا توجد أهداف حالية'}</small>
            </Link>
          </div>
        </section>

        <Card className={styles.modulesCard}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>عند الحاجة</p>
              <h2>أدوات إضافية</h2>
            </div>
            <Link className={styles.textAction} href="/workspace">مركز النظام</Link>
          </div>
          <div className={styles.moduleGrid}>
            <Link href="/bank-operations"><strong>العمليات البنكية</strong><small>الرسائل والكشوف والمراجعة</small></Link>
            <Link href="/budget/optimizer"><strong>تحسين الخطة</strong><small>العجز والفائض قبل الاعتماد</small></Link>
            <Link href="/internal-funding"><strong>التمويل الداخلي</strong><small>الطوارئ والاستثمار والاسترداد</small></Link>
            <Link href="/reports/future-pressure"><strong>الضغط المالي القادم</strong><small>الدورات والرحلات والسيناريوهات</small></Link>
            <Link href="/reports/learning"><strong>تعلّم النظام</strong><small>سلوكك ودقة القرارات</small></Link>
            <Link href="/decision-log"><strong>سجل القرارات</strong><small>ما تغير ولماذا وما أثره</small></Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
