import Link from 'next/link';
import { formatSar } from '@/lib/format-money';
import type { CycleReport } from '@/features/reports/types/reports';
import { BUDGET_STATUS_LABELS, financialStatusLabel } from '@/lib/financial-status-labels';

function pct(value: string | null) {
  return value == null ? '—' : `${Number(value).toLocaleString('ar-SA-u-nu-latn', { maximumFractionDigits: 1 })}٪`;
}

export function CycleReportView({ report }: { report: CycleReport }) {
  return (
    <main className="app-page reports-page p47-analysis-page" dir="rtl">
      <div className="page-shell dashboard-shell">
        <header className="p47-analysis-header">
          <div>
            <p className="eyebrow">تقارير الدورة</p>
            <h1>{report.cycle.name}</h1>
            <p>{report.cycle.source === 'SNAPSHOT' ? 'تقرير تاريخي ثابت من لقطة الإغلاق' : 'مراجعة حية للدورة الحالية'}</p>
          </div>
          <div className="dashboard-header-actions">
            <Link className="secondary-link" href="/reports">التقارير</Link>
            <Link className="secondary-link" href="/reports/history">المقارنة التاريخية</Link>
            <Link className="secondary-link" href="/reports/learning">ماذا تعلّم النظام عني؟</Link>
            <Link className="secondary-link" href="/reports/future-pressure">الضغط المالي القادم</Link>
          </div>
        </header>

        {report.cycle.source === 'LIVE' && (
          <section className="report-note">
            <strong>هذه مراجعة تشغيلية وليست نتيجة إغلاق.</strong>
            <span>الفائض والعجز النهائيان لا يُعتمدان إلا عند إغلاق الدورة وحفظ CycleSnapshot.</span>
          </section>
        )}

        <section className="p47-analysis-kpis">
          <article><span>الدخل الفعلي</span><strong>{formatSar(report.income.actual)}</strong><small>المتوقع {formatSar(report.income.expected)}</small></article>
          <article><span>المصروف الفعلي</span><strong>{formatSar(report.expense.actual)}</strong><small>المخطط {formatSar(report.expense.planned)}</small></article>
          <article><span>الادخار الفعلي</span><strong>{formatSar(report.saving.actual)}</strong><small>المخطط {formatSar(report.saving.planned)}</small></article>
          <article><span>غير المخطط</span><strong>{report.expense.unplanned == null ? 'غير متوفر في اللقطة' : formatSar(report.expense.unplanned)}</strong><small>مصروفات مصنفة كغير مخططة</small></article>
        </section>

        <section className="dashboard-main-grid">
          <article className="dashboard-card p47-report-card">
            <div className="dashboard-card-head"><div><p>نتيجة الدورة</p><h2>{report.finalResult.status === 'FINALIZED' ? 'نهائية' : 'بانتظار الإغلاق'}</h2></div></div>
            {report.finalResult.status === 'FINALIZED' ? (
              <dl className="dashboard-dl"><div><dt>الفائض</dt><dd>{formatSar(report.finalResult.surplus ?? '0')}</dd></div><div><dt>العجز</dt><dd>{formatSar(report.finalResult.deficit ?? '0')}</dd></div></dl>
            ) : <p className="dashboard-empty">لا نشتق فائضًا أو عجزًا نهائيًا قبل عملية الإغلاق الرسمية.</p>}
          </article>
          <article className="dashboard-card p47-report-card">
            <div className="dashboard-card-head"><div><p>الأموال المحمية</p><h2>الأهداف والطوارئ</h2></div></div>
            <dl className="dashboard-dl"><div><dt>مساهمات الأهداف</dt><dd>{formatSar(report.goalContributions)}</dd></div><div><dt>مساهمات الطوارئ</dt><dd>{formatSar(report.emergencyContribution)}</dd></div></dl>
          </article>
        </section>

        <section className="dashboard-card report-table-card p47-report-card">
          <div className="dashboard-card-head"><div><p>انحراف البنود</p><h2>المخطط مقابل الفعلي</h2></div></div>
          {report.categoryVariance.length === 0 ? <p className="dashboard-empty">لا توجد بيانات بنود متاحة لهذا التقرير.</p> : (
            <div className="report-table-wrap"><table className="report-table"><thead><tr><th>البند</th><th>المخطط</th><th>الفعلي</th><th>الانحراف</th><th>الاستخدام</th><th>الحالة</th></tr></thead><tbody>{report.categoryVariance.map((item) => (
              <tr key={item.categoryId}><td data-label="البند">{item.categoryName}</td><td data-label="المخطط">{formatSar(item.planned)}</td><td data-label="الفعلي">{formatSar(item.actual)}</td><td data-label="الانحراف">{formatSar(item.variance)}</td><td data-label="الاستخدام">{pct(item.utilizationPercent)}</td><td data-label="الحالة">{financialStatusLabel(BUDGET_STATUS_LABELS, item.status)}</td></tr>
            ))}</tbody></table></div>
          )}
        </section>

        <section className="dashboard-main-grid">
          <article className="dashboard-card p47-report-card"><div className="dashboard-card-head"><div><p>أكبر تجاوز</p><h2>{report.biggestOverrun?.categoryName ?? 'لا يوجد تجاوز'}</h2></div></div>{report.biggestOverrun ? <p>{formatSar(report.biggestOverrun.actual)} فعلي مقابل {formatSar(report.biggestOverrun.planned)} مخطط.</p> : <p className="dashboard-empty">لا يوجد بند فعلي أعلى من مخصصه في البيانات المتاحة.</p>}</article>
          <article className="dashboard-card p47-report-card"><div className="dashboard-card-head"><div><p>ملخص المستشار</p><h2>{report.reviewStatus ?? (report.cycle.source === 'LIVE' ? 'تشغيلي' : 'غير متوفر')}</h2></div></div><p>{report.advisorSummary ?? 'لا يوجد ملخص مستشار محفوظ لهذا التقرير.'}</p></article>
        </section>
      </div>
    </main>
  );
}
