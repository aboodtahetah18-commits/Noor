import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getDashboardSummary } from '@/features/dashboard/queries/get-dashboard-summary';
import { getDailyCommandCenter } from '@/features/dashboard/queries/get-daily-command-center';
import { formatSar } from '@/lib/format-money';
import { viewRecommendationAction } from '@/app/(protected)/advisor/actions';
import { OBLIGATION_STATUS_LABELS, financialStatusLabel } from '@/lib/financial-status-labels';
import { BankMessageDialogTrigger } from '@/components/bank-message-dialog';
import { Button } from '@/components/ui';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { BrandLogo } from '@/components/brand/brand-logo';
import styles from './dashboard.module.css';

function metricValue(value: string | null, blockedLabel = 'غير متاح بعد') {
  return value === null ? blockedLabel : formatSar(value);
}
function pct(value: string | null) {
  return value === null ? '—' : `${Number(value).toLocaleString('ar-SA-u-nu-latn', { maximumFractionDigits: 1 })}٪`;
}

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();
  const dashboard = await getDashboardSummary(user.id);

  if (!dashboard) {
    return (
      <main className={styles.page} dir="rtl">
        <section className={styles.emptyState}>
          <div className={styles.emptyIcon}><LucideIcon name="walletCards" size={32}/></div>
          <span>مستقبلي</span>
          <h1>ابدأ دورتك المالية الأولى</h1>
          <p>أنشئ دورة مالية حتى يبدأ نماء في حساب وضعك المالي الحقيقي.</p>
          <Link className={styles.primaryButton} href="/cycles/new">بدء دورة مالية</Link>
        </section>
      </main>
    );
  }

  const budgetUtilization = Math.min(100, Math.max(0, Number(dashboard.budget.utilizationPercent ?? '0')));
  const commandCenter = dashboard.cycle.source === 'LIVE'
    ? await getDailyCommandCenter(user.id, dashboard.cycle.id)
    : null;
  const overdueCount = dashboard.upcomingObligations.filter((item) => item.status === 'OVERDUE').length;

  return (
    <main className={styles.page} dir="rtl">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.heroBrand}><BrandLogo surface="dark" priority /></div>
          <span className={styles.brandKicker}>نماء</span>
          <h1>مرحبًا {user.name ? user.name.split(' ')[0] : ''}</h1>
          <p>هنا نظرة سريعة على وضعك المالي اليوم</p>
        </div>
        <div className={styles.heroTools}>
          <Link href="/alerts" aria-label="التنبيهات"><LucideIcon name="bell" size={24}/></Link>
          <Link href="/settings" aria-label="الإعدادات"><LucideIcon name="settings" size={24}/></Link>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.cycleCard}>
          <div className={styles.cycleIcon}><LucideIcon name="calendarDays" size={24}/></div>
          <div className={styles.cycleCopy}>
            <span>أنت في دورتك المالية الحالية</span>
            <strong>{dashboard.cycle.name}</strong>
            <small>{dashboard.cycle.remainingDays} يوم حتى الدخل القادم</small>
          </div>
          <div className={styles.cycleProgress}>
            <div><span style={{width:`${Math.max(8,100-Math.min(100,dashboard.cycle.remainingDays*3.3))}%`}}/></div>
            <b>{dashboard.cycle.remainingDays} يوم</b>
          </div>
        </section>

        <section className={styles.kpiGrid}>
          <article className={styles.kpiCard}>
            <span className={styles.kpiIcon}><LucideIcon name="walletCards" size={24}/></span>
            <div><span>الرصيد الحالي</span><strong>{formatSar(dashboard.liquidity.total)}</strong><small>إجمالي السيولة الفعلية</small></div>
          </article>
          <article className={styles.kpiCard}>
            <span className={styles.kpiIcon}><LucideIcon name="banknote" size={24}/></span>
            <div><span>إجمالي الدخل</span><strong>{formatSar(dashboard.income.actual)}</strong><small>المتوقع {formatSar(dashboard.income.expected)}</small></div>
          </article>
          <article className={styles.kpiCard}>
            <span className={styles.kpiIcon}><LucideIcon name="chart" size={24}/></span>
            <div><span>إجمالي المصروفات</span><strong>{formatSar(dashboard.budget.actual)}</strong><small>المخطط {formatSar(dashboard.budget.planned)}</small></div>
          </article>
        </section>

        <section className={styles.quickActions} aria-label="إجراءات سريعة">
          <Link href="/expenses"><span><LucideIcon name="plus" size={24}/></span><b>إضافة عملية</b></Link>
          <Link href="/transfers/new"><span><LucideIcon name="repeat2" size={24}/></span><b>تحويل</b></Link>
          <BankMessageDialogTrigger className={styles.quickButton}><span><LucideIcon name="creditCard" size={24}/></span><b>رسالة بنك</b></BankMessageDialogTrigger>
          <Link href="/goals"><span><LucideIcon name="target" size={24}/></span><b>الأهداف</b></Link>
          <Link href="/budget"><span><LucideIcon name="chart" size={24}/></span><b>الميزانية</b></Link>
          <Link href="/more"><span><LucideIcon name="layoutGrid" size={24}/></span><b>المزيد</b></Link>
        </section>

        <section className={styles.bankHub} aria-labelledby="bank-hub-heading">
          <header className={styles.bankHubHeading}>
            <div><span>إدارة البنوك</span><h2 id="bank-hub-heading">البنك المركزي والبنوك التابعة</h2></div>
            <Link href="/bank-operations">عرض المركز</Link>
          </header>
          <div className={styles.bankHubGrid}>
            <Link href="/bank-operations?bank=central" className={styles.bankHubCard}>
              <span className={styles.bankHubIcon}><LucideIcon name="landmark" size={24}/></span>
              <strong>البنك المركزي</strong><small>الرقابة والتنسيق والقرارات</small>
            </Link>
            <Link href="/bank-operations?bank=hilal" className={styles.bankHubCard}>
              <span className={styles.bankHubIcon}><LucideIcon name="walletCards" size={24}/></span>
              <strong>بنك الهلال</strong><small>التشغيل والالتزامات</small>
            </Link>
            <Link href="/bank-operations?bank=solvency" className={styles.bankHubCard}>
              <span className={styles.bankHubIcon}><LucideIcon name="lockKeyhole" size={24}/></span>
              <strong>بنك ملاذ</strong><small>الادخار والطوارئ</small>
            </Link>
            <Link href="/bank-operations?bank=assets" className={styles.bankHubCard}>
              <span className={styles.bankHubIcon}><LucideIcon name="chart" size={24}/></span>
              <strong>بنك أصول</strong><small>الاستثمارات والأصول</small>
            </Link>
          </div>
          <Link className={styles.bankStatementLink} href="/bank-statements">
            <LucideIcon name="receiptText" size={20}/>
            <span>استيراد كشف الحساب ومراجعة العمليات</span>
            <LucideIcon name="chevronLeft" size={20}/>
          </Link>
        </section>

        <section className={styles.mainGrid}>
          <article className={styles.budgetPanel}>
            <header><div><span>الميزانية الشهرية</span><strong>{formatSar(dashboard.budget.actual)} من {formatSar(dashboard.budget.planned)}</strong></div><Link href="/budget">عرض التفاصيل</Link></header>
            <div className={styles.progressTrack}><span style={{width:`${budgetUtilization}%`}}/></div>
            <footer><span>تم استخدام {pct(dashboard.budget.utilizationPercent)} من ميزانيتك</span><b>{formatSar(dashboard.budget.remaining)} متبقٍ</b></footer>
          </article>

          <article className={styles.safePanel}>
            <header><div><span>المتاح الآمن للصرف</span><strong>{metricValue(dashboard.safeToSpend.amount)}</strong></div><LucideIcon name="lockKeyhole" size={24}/></header>
            <p>{dashboard.safeToSpend.status === 'BLOCKED' ? 'بانتظار اكتمال قاعدة الأمان المالي.' : `الحد اليومي الآمن ${metricValue(dashboard.dailySafeLimit.amount)}`}</p>
            <Link href="/reports/future-pressure">عرض التوقع المالي</Link>
          </article>

          <article className={styles.advisorPanel}>
            <header><div><span>توصية ذكية</span><h2>{dashboard.topRecommendation?.title ?? 'وضعك المالي مستقر الآن'}</h2></div><LucideIcon name="sparkles" size={24}/></header>
            <p>{dashboard.topRecommendation?.message ?? 'لا توجد توصية مفتوحة تستحق التدخل في الوقت الحالي.'}</p>
            {dashboard.topRecommendation ? (
              <form action={viewRecommendationAction}>
                <input type="hidden" name="recommendationId" value={dashboard.topRecommendation.id}/>
                <Button variant="secondary" type="submit">عرض المزيد</Button>
              </form>
            ) : <Link href="/advisor">فتح مركز التوصيات</Link>}
          </article>

          <article className={styles.obligationsPanel}>
            <header><div><span>الالتزامات القادمة</span><h2>{overdueCount ? `${overdueCount} متأخر` : 'مواعيدك القادمة'}</h2></div><Link href="/obligations">عرض الكل</Link></header>
            <div className={styles.obligationList}>
              {dashboard.upcomingObligations.slice(0,4).map((item)=>(
                <div key={item.id}>
                  <span><b>{item.name}</b><small>{item.dueDate}</small></span>
                  <span><strong>{formatSar(item.amount)}</strong><small>{financialStatusLabel(OBLIGATION_STATUS_LABELS,item.status)}</small></span>
                </div>
              ))}
              {!dashboard.upcomingObligations.length ? <p>لا توجد استحقاقات قريبة.</p> : null}
            </div>
          </article>
        </section>

        {commandCenter ? (
          <section className={styles.followupGrid}>
            <Link href="/bank-operations"><span>قرارات بنكية</span><strong>{commandCenter.bankPending}</strong></Link>
            <Link href="/reports/learning"><span>انحرافات غير مفسرة</span><strong>{commandCenter.unexplainedDeviations}</strong></Link>
            <Link href="/goals"><span>أهداف بها فجوة</span><strong>{commandCenter.goalGaps}</strong></Link>
            <Link href="/internal-funding"><span>استردادات داخلية</span><strong>{commandCenter.fundingRecoveries}</strong></Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}
