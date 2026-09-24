import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getCurrentFinancialCycle } from '@/features/cycles/queries/get-current-cycle';
import { getCycleReport } from '@/features/reports/queries/get-cycle-report';
import { CycleReportView } from '@/features/reports/components/cycle-report-view';
import { formatSar } from '@/lib/format-money';
import { LucideIcon } from '@/components/ui/lucide-icon';

const reviewStatusLabels:Record<string,string>={OPEN:'مفتوحة',IN_REVIEW:'قيد المراجعة',COMPLETED:'مكتملة',FINALIZED:'مغلقة'};

export default async function ReportsPage() {
  const user = await requireAuthenticatedUser();
  const cycle = await getCurrentFinancialCycle(user.id);

  if (!cycle) {
    return <main dir="rtl">
      <section className="namaa-wide-only namaa-observatory-wide namaa-reports-desktop">
        <header className="namaa-observatory-hero namaa-wide-card">
          <div><p>الرقابة المالية</p><h1>المرصد</h1><span>مراقبة الاستقرار المالي والسيولة والمخاطر على مستوى المنصة كاملة.</span></div>
          <LucideIcon name="target" size={32}/>
        </header>
        <section className="namaa-observatory-empty namaa-wide-panel">
          <strong>لا توجد دورة تشغيلية نشطة</strong>
          <p>ابدأ دورة مالية حتى تظهر مؤشرات المرصد والمقارنات والتوقعات.</p>
          <Link href="/cycles/new" className="namaa-wide-action">بدء دورة</Link>
        </section>
      </section>
      <div className="namaa-mobile-only app-page reports-page p47-analysis-page"><div className="page-shell p47-analysis-shell"><section className="empty-state"><p className="eyebrow">التقارير</p><div className="title-with-help"><h1>لا توجد دورة تشغيلية</h1></div><div className="dashboard-header-actions"><Link className="primary-link" href="/cycles/new">بدء دورة</Link><Link className="secondary-link" href="/reports/history">الدورات السابقة</Link><Link className="secondary-link" href="/reports/learning">تعلم النظام</Link><Link className="secondary-link" href="/reports/future-pressure">الضغط المالي القادم</Link></div></section></div></div>
    </main>;
  }

  const report = await getCycleReport(user.id, cycle.id);
  if (!report) return null;

  const utilization = Number(report.expense.planned) > 0 ? Math.min(999, (Number(report.expense.actual) / Number(report.expense.planned)) * 100) : 0;
  const incomeDelta = Number(report.income.actual) - Number(report.income.expected);
  const expenseDelta = Number(report.expense.actual) - Number(report.expense.planned);
  const savingDelta = Number(report.saving.actual) - Number(report.saving.planned);

  return <main dir="rtl">
    <section className="namaa-wide-only namaa-observatory-wide namaa-reports-desktop">
      <header className="namaa-observatory-hero namaa-wide-card">
        <div><p>الرقابة والاستقرار المالي</p><h1>المرصد</h1><span>مؤشرات المنصة كاملة مع المقارنات والتوقعات والتنبيهات المرتبطة بالمخاطر.</span></div>
        <div className="namaa-observatory-actions">
          <Link href="/reports/history" className="namaa-wide-action-secondary">المقارنة التاريخية</Link>
          <Link href="/reports/future-pressure" className="namaa-wide-action-secondary">التوقعات المستقبلية</Link>
        </div>
      </header>

      <section className="namaa-observatory-kpis">
        <article><span>الدخل الفعلي</span><strong>{formatSar(report.income.actual)}</strong><small>{incomeDelta>=0?'أعلى من المتوقع':'أقل من المتوقع'} بـ {formatSar(String(Math.abs(incomeDelta)))}</small></article>
        <article><span>المصروف الفعلي</span><strong>{formatSar(report.expense.actual)}</strong><small>استخدام {utilization.toLocaleString('ar-SA-u-nu-latn',{maximumFractionDigits:1})}٪ من المخطط</small></article>
        <article><span>الادخار</span><strong>{formatSar(report.saving.actual)}</strong><small>{savingDelta>=0?'فوق الخطة':'دون الخطة'} بـ {formatSar(String(Math.abs(savingDelta)))}</small></article>
        <article><span>حالة الدورة</span><strong>{report.finalResult.status==='FINALIZED'?'مغلقة':'نشطة'}</strong><small>{report.cycle.source==='LIVE'?'بيانات حية':'لقطة تاريخية'}</small></article>
      </section>

      <div className="namaa-observatory-layout">
        <section className="namaa-observatory-main namaa-wide-panel">
          <div className="namaa-investments-section-title"><div><p>الوضع العام الآن</p><h2>{report.cycle.name}</h2></div><LucideIcon name="chart" size={20}/></div>
          <div className="namaa-observatory-grid">
            <article><span>الانحراف في المصروف</span><strong className={expenseDelta>0?'is-risk':''}>{formatSar(String(expenseDelta))}</strong><small>{expenseDelta>0?'تجاوز المخطط':'ضمن المخطط'}</small></article>
            <article><span>الأموال المحمية</span><strong>{formatSar(String(Number(report.goalContributions)+Number(report.emergencyContribution)))}</strong><small>أهداف + طوارئ</small></article>
            <article><span>أكبر تجاوز</span><strong>{report.biggestOverrun?.categoryName??'لا يوجد'}</strong><small>{report.biggestOverrun?formatSar(report.biggestOverrun.actual):'الوضع مستقر'}</small></article>
            <article><span>حالة المراجعة</span><strong>{reviewStatusLabels[report.reviewStatus??'']??'تشغيلية'}</strong><small>تتحدث مع كل دورة</small></article>
          </div>

          <div className="namaa-observatory-trends">
            <div className="namaa-investments-section-title"><div><p>المقارنة</p><h2>اليومي والأسبوعي والشهري والسنوي</h2></div><LucideIcon name="refreshCw" size={20}/></div>
            <div className="namaa-observatory-periods"><span>يومي</span><span>أسبوعي</span><span>شهري</span><span>سنوي</span></div>
            <p>يستخدم المرصد نفس المصدر الحاكم للمقارنة التاريخية، مع إبقاء القراءة الحالية واضحة وعدم خلطها بالبيانات القديمة.</p>
          </div>
        </section>

        <aside className="namaa-observatory-side namaa-wide-panel">
          <div className="namaa-investments-section-title"><div><p>ما يحتاج الانتباه</p><h2>المخاطر والحالات</h2></div><LucideIcon name="triangleAlert" size={20}/></div>
          {expenseDelta>0?<article className="is-warning"><strong>تجاوز في الإنفاق</strong><p>المصروف الحالي أعلى من المخطط بـ {formatSar(String(expenseDelta))}.</p><Link href="/cases">فتح مسار القرار</Link></article>:<article><strong>الإنفاق ضمن الخطة</strong><p>لا يوجد تجاوز حالي في المصروف الإجمالي.</p></article>}
          {report.biggestOverrun?<article className="is-warning"><strong>{report.biggestOverrun.categoryName}</strong><p>أكبر بند متجاوز يحتاج متابعة سياقية.</p></article>:null}
          <article><strong>التوقعات المستقبلية</strong><p>تحليل الضغط المالي القادم والسيولة قبل وقوع الخطر.</p><Link href="/reports/future-pressure">فتح التوقعات</Link></article>
          <article><strong>مسار الخطر الحرج</strong><p>إيقاف مؤقت، تصعيد للمستخدم والمحافظ، ثم تفعيل لجنة الاستقرار والسيولة والتمويل عند التحقق.</p></article>
        </aside>
      </div>
    </section>

    <div className="namaa-mobile-only"><CycleReportView report={report}/></div>
  </main>;
}
